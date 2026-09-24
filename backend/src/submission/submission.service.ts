import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Submission } from '../database/entities/submission.entity';
import { Photo } from '../database/entities/photo.entity';
import { Ulb } from '../database/entities/ulb.entity';
import { User } from '../database/entities/user.entity';
import { InspectionCategory } from '../database/entities/inspection-category.entity';
import { SubmissionStatus } from '../common/enums/submission-status.enum';
import { UlbType } from '../common/enums/ulb-type.enum';
import { GeoService } from '../geo/geo.service';
import { PhotoService } from '../photo/photo.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { v4 as uuidv4 } from 'uuid';

/** IST offset = UTC+5:30 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
/** Submission window: 05:00–07:30 IST */
const WINDOW_START_MINUTES = 5 * 60; // 300
const WINDOW_END_MINUTES = 7 * 60 + 30; // 450

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(Photo)
    private readonly photoRepo: Repository<Photo>,
    private readonly geoService: GeoService,
    private readonly photoService: PhotoService,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Status logic ────────────────────────────────────────────────────────────

  /**
   * Determines submission status based on IST time.
   * Window: 05:00–07:30 inclusive.
   */
  determineStatus(serverTime: Date): SubmissionStatus {
    const istMs = serverTime.getTime() + IST_OFFSET_MS;
    const istDate = new Date(istMs);
    const minuteOfDay =
      istDate.getUTCHours() * 60 + istDate.getUTCMinutes();

    if (minuteOfDay >= WINDOW_START_MINUTES && minuteOfDay <= WINDOW_END_MINUTES) {
      return SubmissionStatus.ON_TIME;
    }
    return SubmissionStatus.LATE;
  }

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(
    commissionerUser: JwtPayload,
    dto: CreateSubmissionDto,
    files: Express.Multer.File[],
  ): Promise<{ submission: Submission; photoCount: number }> {
    if (!files || files.length < 1 || files.length > 10) {
      throw new BadRequestException(
        'Between 1 and 10 photos are required per submission.',
      );
    }

    if (files.length !== dto.photos_meta.length) {
      throw new BadRequestException(
        `Mismatch: ${files.length} files uploaded but ${dto.photos_meta.length} photo metadata entries provided.`,
      );
    }

    const ulbId = commissionerUser.ulb_id;
    if (!ulbId) {
      throw new BadRequestException('Commissioner must be assigned to a ULB.');
    }

    const userId = commissionerUser.sub || (commissionerUser as any).user_id;
    if (!userId) {
      throw new BadRequestException('Commissioner user ID not found in session.');
    }

    // Validate foreign keys in database to prevent 500 constraint crashes
    const ulbRepo = this.dataSource.getRepository(Ulb);
    const catRepo = this.dataSource.getRepository(InspectionCategory);
    const userRepo = this.dataSource.getRepository(User);

    const [ulbExists, catExists, userExists] = await Promise.all([
      ulbRepo.findOne({ where: { ulb_id: ulbId } }),
      catRepo.findOne({ where: { category_id: dto.category_id } }),
      userRepo.findOne({ where: { user_id: userId } }),
    ]);

    if (!ulbExists) {
      throw new BadRequestException(
        `Assigned ULB [${ulbId}] not found in database. Please log out and log in again.`,
      );
    }
    if (!catExists) {
      throw new BadRequestException(
        `Category [${dto.category_id}] not found. Please refresh and select an active category.`,
      );
    }
    if (!userExists) {
      throw new BadRequestException(
        `User [${userId}] not found. Please log in again.`,
      );
    }

    const serverTime = new Date();
    const status = this.determineStatus(serverTime);

    // Use a stable temp ID for file keys (replaced by real submission_id after insert)
    const tempSubmissionId = uuidv4();

    // Upload photos and validate geo
    const uploadResults: Array<{
      fileKey: string;
      fileSizeBytes: number;
      latitude: number;
      longitude: number;
      captured_at: Date;
      geoFlagged: boolean;
    }> = [];

    let anyGeoFlagged = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const meta = dto.photos_meta[i];

      const lat = Number.isFinite(meta.latitude) ? Number(meta.latitude) : 0;
      const lng = Number.isFinite(meta.longitude) ? Number(meta.longitude) : 0;
      const capturedAtDate =
        meta.captured_at && !isNaN(Date.parse(meta.captured_at))
          ? new Date(meta.captured_at)
          : serverTime;

      const [geoResult, uploadResult] = await Promise.all([
        this.geoService.validatePhotoLocation(ulbId, lat, lng),
        this.photoService.upload(file, tempSubmissionId),
      ]);

      const geoFlagged = !geoResult.valid;
      if (geoFlagged) anyGeoFlagged = true;

      uploadResults.push({
        fileKey: uploadResult.fileKey,
        fileSizeBytes: uploadResult.fileSizeBytes,
        latitude: lat,
        longitude: lng,
        captured_at: capturedAtDate,
        geoFlagged,
      });
    }

    // Persist in transaction
    const submission = await this.dataSource.transaction(async (manager) => {
      const devTimestamp =
        dto.device_timestamp && !isNaN(Date.parse(dto.device_timestamp))
          ? new Date(dto.device_timestamp)
          : serverTime;

      const submissionEntity = manager.create(Submission, {
        ulb_id: ulbId,
        category_id: dto.category_id,
        submitted_by: userId,
        submitted_at: serverTime,
        device_timestamp: devTimestamp,
        status,
        geo_flagged: anyGeoFlagged,
      });

      const saved = await manager.save(Submission, submissionEntity);

      const photoEntities = uploadResults.map((r) =>
        manager.create(Photo, {
          submission_id: saved.submission_id,
          file_key: r.fileKey,
          latitude: r.latitude,
          longitude: r.longitude,
          captured_at: r.captured_at,
          file_size_bytes: r.fileSizeBytes,
        }),
      );

      await manager.save(Photo, photoEntities);

      return saved;
    });

    void this.auditLogService.log(
      'submission.create',
      userId,
      {
        submission_id: submission.submission_id,
        ulb_id: ulbId,
        status,
        geo_flagged: anyGeoFlagged,
      },
    );

    return { submission, photoCount: files.length };
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async findAllByDate(date: string): Promise<any[]> {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const submissions = await this.submissionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.ulb', 'ulb')
      .leftJoinAndSelect('s.category', 'category')
      .leftJoinAndSelect('s.user', 'user')
      .leftJoinAndSelect('s.photos', 'photos')
      .where('s.submitted_at BETWEEN :start AND :end', { start, end })
      .orderBy('s.submitted_at', 'ASC')
      .getMany();

    return Promise.all(
      submissions.map(async (sub) => {
        if (!sub.photos || sub.photos.length === 0) return sub;
        const photosWithUrls = await Promise.all(
          sub.photos.map(async (photo) => ({
            ...photo,
            signed_url: await this.photoService.getSignedUrl(photo.file_key),
          })),
        );
        return { ...sub, photos: photosWithUrls };
      }),
    );
  }

  async findOne(id: string): Promise<Submission & { photos: Array<Photo & { signed_url: string }> }> {
    const submission = await this.submissionRepo.findOne({
      where: { submission_id: id },
      relations: ['ulb', 'category', 'user', 'photos'],
    });
    if (!submission) throw new NotFoundException(`Submission ${id} not found.`);

    const photosWithUrls = await Promise.all(
      submission.photos.map(async (photo) => ({
        ...photo,
        signed_url: await this.photoService.getSignedUrl(photo.file_key),
      })),
    );

    return { ...submission, photos: photosWithUrls };
  }

  async findMySubmissions(
    userId: string,
    date?: string,
  ): Promise<Submission[]> {
    const qb = this.submissionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.category', 'category')
      .leftJoinAndSelect('s.photos', 'photos')
      .where('s.submitted_by = :userId', { userId });

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      qb.andWhere('s.submitted_at BETWEEN :start AND :end', { start, end });
    }

    return qb.orderBy('s.submitted_at', 'DESC').getMany();
  }

  /**
   * Inserts ABSENT records for ULBs that missed submission by the deadline.
   * Called by the TasksService escalation cron job.
   */
  async insertAbsentRows(
    date: string,
    ulbIds: string[],
    categoryIds: string[],
  ): Promise<void> {
    if (ulbIds.length === 0 || categoryIds.length === 0) return;

    const submittedAt = new Date(`${date}T07:35:00.000Z`); // post-deadline marker

    const rows: Partial<Submission>[] = [];

    for (const ulbId of ulbIds) {
      for (const categoryId of categoryIds) {
        rows.push({
          ulb_id: ulbId,
          category_id: categoryId,
          submitted_by: '00000000-0000-0000-0000-000000000000', // system user sentinel
          submitted_at: submittedAt,
          device_timestamp: submittedAt,
          status: SubmissionStatus.ABSENT,
          geo_flagged: false,
        });
      }
    }

    // Batch insert, ignore existing (idempotent)
    await this.submissionRepo
      .createQueryBuilder()
      .insert()
      .into(Submission)
      .values(rows as Submission[])
      .orIgnore()
      .execute();

    this.logger.log(
      `Inserted ${rows.length} ABSENT records for date ${date}`,
    );
  }

  /**
   * Returns ULB IDs that have NOT submitted for the given date.
   */
  async getUlbsWithNoSubmission(
    date: string,
    allUlbIds: string[],
  ): Promise<string[]> {
    if (allUlbIds.length === 0) return [];

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const submitted = await this.submissionRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.ulb_id', 'ulb_id')
      .where('s.submitted_at BETWEEN :start AND :end', { start, end })
      .andWhere('s.status != :absent', { absent: SubmissionStatus.ABSENT })
      .getRawMany<{ ulb_id: string }>();

    const submittedSet = new Set(submitted.map((r) => r.ulb_id));
    return allUlbIds.filter((id) => !submittedSet.has(id));
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  /**
   * Returns complete hierarchical analytics for a given date:
   * - Overall compliance status counts
   * - 24 Corporations status counts and breakdown
   * - 7 Regions with their municipalities counts and upload statuses
   */
  async getAnalytics(date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const ulbRepo = this.dataSource.getRepository(Ulb);
    const catRepo = this.dataSource.getRepository(InspectionCategory);

    const [ulbs, categories, submissions] = await Promise.all([
      ulbRepo.find({ where: { active: true }, order: { name: 'ASC' } }),
      catRepo.find({ where: { active: true }, order: { display_order: 'ASC' } }),
      this.submissionRepo
        .createQueryBuilder('s')
        .where('s.submitted_at BETWEEN :start AND :end', { start, end })
        .getMany(),
    ]);

    const totalCategories = categories.length;

    // Group submissions by ULB ID
    const subMap = new Map<string, Submission[]>();
    for (const sub of submissions) {
      if (!subMap.has(sub.ulb_id)) subMap.set(sub.ulb_id, []);
      subMap.get(sub.ulb_id)!.push(sub);
    }

    const mapUlbItem = (ulb: Ulb) => {
      const subs = subMap.get(ulb.ulb_id) || [];
      const catIds = new Set(subs.map((s) => s.category_id));
      const hasLate = subs.some((s) => s.status === SubmissionStatus.LATE);
      const hasOnTime = subs.some((s) => s.status === SubmissionStatus.ON_TIME);
      const isAbsent =
        subs.length > 0 && subs.every((s) => s.status === SubmissionStatus.ABSENT);
      const hasUploaded = hasOnTime || hasLate;

      let status: SubmissionStatus | 'pending' = 'pending';
      if (hasLate) {
        status = SubmissionStatus.LATE;
      } else if (hasOnTime) {
        status = SubmissionStatus.ON_TIME;
      } else if (isAbsent) {
        status = SubmissionStatus.ABSENT;
      } else {
        status = 'pending';
      }

      let latestTime: string | null = null;
      for (const s of subs) {
        if (s.status !== SubmissionStatus.ABSENT) {
          const iso = s.submitted_at ? new Date(s.submitted_at).toISOString() : null;
          if (iso && (!latestTime || iso > latestTime)) {
            latestTime = iso;
          }
        }
      }

      return {
        ulb_id: ulb.ulb_id,
        name: ulb.name,
        district: ulb.district,
        region: ulb.region || '',
        status,
        has_uploaded: hasUploaded,
        on_time: status === SubmissionStatus.ON_TIME,
        late: status === SubmissionStatus.LATE,
        submitted_at: latestTime,
        categories_done: catIds.size,
        total_categories: totalCategories,
      };
    };

    const calcCounts = (
      items: Array<{ status: SubmissionStatus | 'pending'; has_uploaded: boolean }>,
    ) => {
      const total = items.length;
      const submitted = items.filter((i) => i.has_uploaded).length;
      const on_time = items.filter((i) => i.status === SubmissionStatus.ON_TIME).length;
      const late = items.filter((i) => i.status === SubmissionStatus.LATE).length;
      const absent = items.filter((i) => i.status === SubmissionStatus.ABSENT).length;
      const pending = items.filter((i) => i.status === 'pending').length;
      const compliance_pct =
        total > 0 ? Math.round((submitted / total) * 100) : 0;
      return { total, submitted, on_time, late, absent, pending, compliance_pct };
    };

    // 1. Corporations (24)
    const corpUlbs = ulbs.filter((u) => u.type === UlbType.CORPORATION);
    const corpItems = corpUlbs.map(mapUlbItem);
    const corpCounts = calcCounts(corpItems);

    // 2. Municipalities by 7 Regions
    const OFFICIAL_REGIONS = [
      'Chengalpattu',
      'Vellore',
      'Salem',
      'Thanjavur',
      'Madurai',
      'Tiruppur',
      'Tirunelveli',
    ];

    const regionAnalytics = OFFICIAL_REGIONS.map((regionName) => {
      const muniUlbs = ulbs.filter(
        (u) => u.type === UlbType.MUNICIPALITY && u.region === regionName,
      );
      const muniItems = muniUlbs.map(mapUlbItem);
      const muniCounts = calcCounts(muniItems);

      return {
        name: regionName,
        ...muniCounts,
        municipalities: muniItems,
      };
    });

    // 3. Overall
    const allMuniItems = regionAnalytics.flatMap((r) => r.municipalities);
    const allItems = [...corpItems, ...allMuniItems];
    const overallCounts = calcCounts(allItems);

    return {
      date,
      overall: overallCounts,
      corporations: {
        ...corpCounts,
        items: corpItems,
      },
      regions: regionAnalytics,
    };
  }
}
