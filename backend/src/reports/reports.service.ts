import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';
import { MinioService } from '../photo/minio.service';
import { SubmissionStatus } from '../common/enums/submission-status.enum';

interface SubmissionRow {
  ulb_id: string;
  ulb_name: string;
  district: string;
  ulb_type: string;
  region: string | null;
  category_id: string;
  category_name: string;
  status: SubmissionStatus;
  submitted_at: Date | null;
}

interface UlbRow {
  ulb_id: string;
  name: string;
  district: string;
  type: string;
  region: string | null;
}

interface CategoryRow {
  category_id: string;
  name: string;
}

const OFFICIAL_REGIONS = [
  'Chengalpattu',
  'Vellore',
  'Salem',
  'Thanjavur',
  'Madurai',
  'Tiruppur',
  'Tirunelveli',
];

const STATUS_FILL: Record<string, ExcelJS.Fill> = {
  [SubmissionStatus.ON_TIME]: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD4EDDA' }, // soft green
  },
  [SubmissionStatus.LATE]: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF3CD' }, // soft yellow/amber
  },
  [SubmissionStatus.ABSENT]: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8D7DA' }, // soft red
  },
};

const YES_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFC3E6CB' }, // green
};

const NO_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF5C6CB' }, // red
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F4E79' }, // Navy blue
};

const SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9E1F2' }, // Light slate blue
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly bucket: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>(
      'MINIO_REPORTS_BUCKET',
      'mcrs-reports',
    );
  }

  // ─── Daily ────────────────────────────────────────────────────────────────────

  async generateDailyReport(date: string): Promise<Buffer> {
    const [submissions, ulbs, categories] = await Promise.all([
      this.fetchSubmissionsForDate(date),
      this.fetchAllUlbs(),
      this.fetchActiveCategories(),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MCRS - Directorate of Municipal Administration';
    wb.created = new Date();

    // Map: ulb_id -> Map<category_id, { status, submitted_at }>
    const lookup = new Map<
      string,
      Map<string, { status: SubmissionStatus; submitted_at: Date | null }>
    >();
    for (const s of submissions) {
      if (!lookup.has(s.ulb_id)) lookup.set(s.ulb_id, new Map());
      lookup.get(s.ulb_id)!.set(s.category_id, {
        status: s.status,
        submitted_at: s.submitted_at,
      });
    }

    const getUlbStats = (ulb: UlbRow) => {
      const catMap = lookup.get(ulb.ulb_id) ?? new Map();
      const catStatuses = categories.map((c) => catMap.get(c.category_id)?.status);
      const hasOnTime = catStatuses.includes(SubmissionStatus.ON_TIME);
      const hasLate = catStatuses.includes(SubmissionStatus.LATE);
      const hasAbsent =
        catStatuses.length > 0 &&
        catStatuses.every((s) => s === SubmissionStatus.ABSENT);
      const hasUploaded = hasOnTime || hasLate;

      let uploadStatus = 'Not Uploaded (Pending)';
      if (hasLate) uploadStatus = 'Uploaded (Late)';
      else if (hasOnTime) uploadStatus = 'Uploaded (On-Time)';
      else if (hasAbsent) uploadStatus = 'Not Uploaded (Absent)';

      let latestTime: string | null = null;
      for (const item of catMap.values()) {
        if (item.submitted_at && item.status !== SubmissionStatus.ABSENT) {
          const timeStr = new Date(item.submitted_at).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          if (!latestTime || timeStr > latestTime) latestTime = timeStr;
        }
      }

      const submittedCatCount = categories.filter((c) => {
        const s = catMap.get(c.category_id)?.status;
        return s === SubmissionStatus.ON_TIME || s === SubmissionStatus.LATE;
      }).length;

      const compliancePct =
        categories.length > 0
          ? Math.round((submittedCatCount / categories.length) * 100)
          : 0;

      return {
        catMap,
        hasUploaded,
        uploadStatus,
        compliancePct,
        latestTime: latestTime ?? '—',
      };
    };

    const corporations = ulbs.filter((u) => u.type === 'corporation');
    const municipalities = ulbs.filter((u) => u.type === 'municipality');

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 1: Executive Summary
    // ──────────────────────────────────────────────────────────────────────────
    const wsSummary = wb.addWorksheet('Executive Summary');
    wsSummary.views = [{ showGridLines: true }];

    // Title
    const titleRow = wsSummary.addRow([
      'TAMIL NADU DIRECTORATE OF MUNICIPAL ADMINISTRATION (DMA)',
    ]);
    titleRow.font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
    wsSummary.mergeCells('A1:I1');

    const subTitleRow = wsSummary.addRow([
      `DAILY COMPLIANCE EXECUTIVE SUMMARY — DATE: ${date}`,
    ]);
    subTitleRow.font = { bold: true, size: 11, color: { argb: 'FF555555' } };
    wsSummary.mergeCells('A2:I2');
    wsSummary.addRow([]); // Blank spacer

    // Overall metrics calculation
    const allStats = ulbs.map(getUlbStats);
    const totalUlbs = ulbs.length;
    const totalUploaded = allStats.filter((s) => s.hasUploaded).length;
    const totalOnTime = allStats.filter((s) => s.uploadStatus.includes('On-Time')).length;
    const totalLate = allStats.filter((s) => s.uploadStatus.includes('Late')).length;
    const totalNotUploaded = totalUlbs - totalUploaded;
    const overallCompliance = totalUlbs > 0 ? Math.round((totalUploaded / totalUlbs) * 100) : 0;

    const corpStats = corporations.map(getUlbStats);
    const corpUploaded = corpStats.filter((s) => s.hasUploaded).length;
    const corpNotUploaded = corporations.length - corpUploaded;
    const corpCompliance =
      corporations.length > 0 ? Math.round((corpUploaded / corporations.length) * 100) : 0;

    // Overall Table
    const sec1 = wsSummary.addRow(['1. STATEWIDE COMPLIANCE KPI OVERVIEW']);
    sec1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sec1.fill = HEADER_FILL;
    wsSummary.mergeCells(`A${sec1.number}:D${sec1.number}`);

    wsSummary.addRow(['Metric', 'Count', 'Total Scope', 'Compliance Rate %']);
    const kpiHeader = wsSummary.getRow(wsSummary.rowCount);
    kpiHeader.font = { bold: true };
    kpiHeader.fill = SECTION_FILL;

    wsSummary.addRow(['Total ULBs (Statewide)', totalUlbs, totalUlbs, '100%']);
    wsSummary.addRow(['24 Corporations', corpUploaded, corporations.length, `${corpCompliance}%`]);
    wsSummary.addRow([
      'Municipalities (7 Regions)',
      totalUploaded - corpUploaded,
      municipalities.length,
      `${municipalities.length > 0 ? Math.round(((totalUploaded - corpUploaded) / municipalities.length) * 100) : 0}%`,
    ]);
    wsSummary.addRow(['Total Uploaded Today', totalUploaded, totalUlbs, `${overallCompliance}%`]);
    wsSummary.addRow(['Uploaded On-Time (05:00–07:30)', totalOnTime, totalUlbs, `${Math.round((totalOnTime / totalUlbs) * 100)}%`]);
    wsSummary.addRow(['Uploaded Late (After 07:30)', totalLate, totalUlbs, `${Math.round((totalLate / totalUlbs) * 100)}%`]);
    wsSummary.addRow(['Not Uploaded (Pending/Absent)', totalNotUploaded, totalUlbs, `${Math.round((totalNotUploaded / totalUlbs) * 100)}%`]);
    wsSummary.addRow([]);

    // 7 Regions Breakdown Table
    const sec2 = wsSummary.addRow(['2. 7 REGIONS MUNICIPALITIES COMPARATIVE PERFORMANCE']);
    sec2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sec2.fill = HEADER_FILL;
    wsSummary.mergeCells(`A${sec2.number}:I${sec2.number}`);

    wsSummary.addRow([
      'S.No',
      'Region Name',
      'Total Municipalities',
      'Uploaded (Submitted)',
      'Not Uploaded',
      'On-Time',
      'Late',
      'Pending/Absent',
      'Compliance %',
    ]);
    const regHeader = wsSummary.getRow(wsSummary.rowCount);
    regHeader.font = { bold: true };
    regHeader.fill = SECTION_FILL;

    let sNo = 1;
    let sumTotal = 0;
    let sumUploaded = 0;
    let sumNotUploaded = 0;
    let sumOnTime = 0;
    let sumLate = 0;
    let sumPending = 0;

    for (const regionName of OFFICIAL_REGIONS) {
      const regionMunis = municipalities.filter((m) => m.region === regionName);
      const regionStats = regionMunis.map(getUlbStats);
      const rTotal = regionMunis.length;
      const rUploaded = regionStats.filter((s) => s.hasUploaded).length;
      const rNotUploaded = rTotal - rUploaded;
      const rOnTime = regionStats.filter((s) => s.uploadStatus.includes('On-Time')).length;
      const rLate = regionStats.filter((s) => s.uploadStatus.includes('Late')).length;
      const rPending = rNotUploaded;
      const rCompliance = rTotal > 0 ? Math.round((rUploaded / rTotal) * 100) : 0;

      sumTotal += rTotal;
      sumUploaded += rUploaded;
      sumNotUploaded += rNotUploaded;
      sumOnTime += rOnTime;
      sumLate += rLate;
      sumPending += rPending;

      wsSummary.addRow([
        sNo++,
        regionName,
        rTotal,
        rUploaded,
        rNotUploaded,
        rOnTime,
        rLate,
        rPending,
        `${rCompliance}%`,
      ]);
    }

    // Totals row
    const regTotalRow = wsSummary.addRow([
      '',
      'TOTAL MUNICIPALITIES',
      sumTotal,
      sumUploaded,
      sumNotUploaded,
      sumOnTime,
      sumLate,
      sumPending,
      `${sumTotal > 0 ? Math.round((sumUploaded / sumTotal) * 100) : 0}%`,
    ]);
    regTotalRow.font = { bold: true };
    regTotalRow.fill = SECTION_FILL;

    wsSummary.columns = [
      { width: 8 },
      { width: 28 },
      { width: 22 },
      { width: 22 },
      { width: 16 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 16 },
    ];

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 2: 24 Corporations
    // ──────────────────────────────────────────────────────────────────────────
    const wsCorp = wb.addWorksheet('24 Corporations');
    wsCorp.views = [{ showGridLines: true }];

    const corpTitle = wsCorp.addRow([
      `24 CORPORATIONS — DAILY COMPLIANCE STATUS (${date})`,
    ]);
    corpTitle.font = { bold: true, size: 13, color: { argb: 'FF1F4E79' } };
    wsCorp.mergeCells(`A1:${String.fromCharCode(65 + 5 + categories.length)}1`);
    wsCorp.addRow([]);

    const corpHeaders = [
      'S.No',
      'Corporation Name',
      'District',
      'Upload Status',
      'Uploaded?',
      ...categories.map((c) => c.name),
      'Latest Submission Time',
      'Compliance %',
    ];
    wsCorp.addRow(corpHeaders);
    const corpHeaderRow = wsCorp.getRow(3);
    corpHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    corpHeaderRow.fill = HEADER_FILL;

    let corpIdx = 1;
    for (const corp of corporations) {
      const stats = getUlbStats(corp);
      const catCells = categories.map((c) => {
        const s = stats.catMap.get(c.category_id)?.status;
        if (!s) return 'Pending';
        if (s === SubmissionStatus.ON_TIME) return 'On-Time';
        if (s === SubmissionStatus.LATE) return 'Late';
        return 'Absent';
      });

      const rowValues = [
        corpIdx++,
        corp.name,
        corp.district,
        stats.uploadStatus,
        stats.hasUploaded ? 'YES' : 'NO',
        ...catCells,
        stats.latestTime,
        `${stats.compliancePct}%`,
      ];
      wsCorp.addRow(rowValues);
      const row = wsCorp.getRow(wsCorp.rowCount);

      // Uploaded? column fill
      const uploadedCell = row.getCell(5);
      uploadedCell.fill = stats.hasUploaded ? YES_FILL : NO_FILL;
      uploadedCell.font = { bold: true };

      // Category column fills
      categories.forEach((c, i) => {
        const s = stats.catMap.get(c.category_id)?.status;
        if (s && STATUS_FILL[s]) {
          row.getCell(6 + i).fill = STATUS_FILL[s];
        }
      });
    }

    wsCorp.columns.forEach((col) => {
      col.width = 18;
    });
    wsCorp.getColumn(1).width = 8;
    wsCorp.getColumn(2).width = 24;

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 3: Regional Municipalities
    // ──────────────────────────────────────────────────────────────────────────
    const wsMuni = wb.addWorksheet('Regional Municipalities');
    wsMuni.views = [{ showGridLines: true }];

    const muniTitle = wsMuni.addRow([
      `7 REGIONS MUNICIPALITIES — UPLOAD STATUS BY REGION (${date})`,
    ]);
    muniTitle.font = { bold: true, size: 13, color: { argb: 'FF1F4E79' } };
    wsMuni.mergeCells(`A1:${String.fromCharCode(65 + 6 + categories.length)}1`);
    wsMuni.addRow([]);

    const muniHeaders = [
      'S.No',
      'Region',
      'Municipality Name',
      'Upload Status',
      'Has Uploaded?',
      ...categories.map((c) => c.name),
      'Submission Time',
      'Compliance %',
    ];
    wsMuni.addRow(muniHeaders);
    const muniHeaderRow = wsMuni.getRow(3);
    muniHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    muniHeaderRow.fill = HEADER_FILL;

    let overallMuniIdx = 1;

    for (const regionName of OFFICIAL_REGIONS) {
      const regionMunis = municipalities.filter((m) => m.region === regionName);
      const rStats = regionMunis.map(getUlbStats);
      const rUploaded = rStats.filter((s) => s.hasUploaded).length;

      // Group section banner
      const groupBanner = wsMuni.addRow([
        `REGION: ${regionName.toUpperCase()} — ${regionMunis.length} Municipalities (${rUploaded} Uploaded, ${regionMunis.length - rUploaded} Not Uploaded)`,
      ]);
      groupBanner.font = { bold: true, color: { argb: 'FF1F4E79' } };
      groupBanner.fill = SECTION_FILL;
      wsMuni.mergeCells(
        `A${groupBanner.number}:${String.fromCharCode(65 + 6 + categories.length)}${groupBanner.number}`,
      );

      let regMuniIdx = 1;
      for (const muni of regionMunis) {
        const stats = getUlbStats(muni);
        const catCells = categories.map((c) => {
          const s = stats.catMap.get(c.category_id)?.status;
          if (!s) return 'Pending';
          if (s === SubmissionStatus.ON_TIME) return 'On-Time';
          if (s === SubmissionStatus.LATE) return 'Late';
          return 'Absent';
        });

        wsMuni.addRow([
          overallMuniIdx++,
          regionName,
          muni.name,
          stats.uploadStatus,
          stats.hasUploaded ? 'YES' : 'NO',
          ...catCells,
          stats.latestTime,
          `${stats.compliancePct}%`,
        ]);
        const row = wsMuni.getRow(wsMuni.rowCount);

        // Uploaded? column fill
        const uploadedCell = row.getCell(5);
        uploadedCell.fill = stats.hasUploaded ? YES_FILL : NO_FILL;
        uploadedCell.font = { bold: true };

        // Category column fills
        categories.forEach((c, i) => {
          const s = stats.catMap.get(c.category_id)?.status;
          if (s && STATUS_FILL[s]) {
            row.getCell(6 + i).fill = STATUS_FILL[s];
          }
        });
      }
      wsMuni.addRow([]); // Spacer between regions
    }

    wsMuni.columns.forEach((col) => {
      col.width = 18;
    });
    wsMuni.getColumn(1).width = 8;
    wsMuni.getColumn(2).width = 18;
    wsMuni.getColumn(3).width = 25;
    wsMuni.getColumn(4).width = 24;
    wsMuni.getColumn(5).width = 15;

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ─── Monthly ───────────────────────────────────────────────────────────────────

  async generateMonthlyReport(yearMonth: string): Promise<Buffer> {
    const [year, month] = yearMonth.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const submissions = await this.fetchSubmissionsForRange(start, end);
    const ulbs = await this.fetchAllUlbs();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MCRS - Directorate of Municipal Administration';
    wb.created = new Date();

    // Aggregate stats per ULB
    const stats = new Map<
      string,
      { onTime: number; late: number; absent: number }
    >();
    for (const s of submissions) {
      if (!stats.has(s.ulb_id)) {
        stats.set(s.ulb_id, { onTime: 0, late: 0, absent: 0 });
      }
      const entry = stats.get(s.ulb_id)!;
      if (s.status === SubmissionStatus.ON_TIME) entry.onTime++;
      else if (s.status === SubmissionStatus.LATE) entry.late++;
      else entry.absent++;
    }

    const corporations = ulbs.filter((u) => u.type === 'corporation');
    const municipalities = ulbs.filter((u) => u.type === 'municipality');

    // SHEET 1: Corporations Monthly
    const wsCorp = wb.addWorksheet('Corporations Monthly');
    wsCorp.addRow([`24 CORPORATIONS — MONTHLY PERFORMANCE (${yearMonth})`]);
    wsCorp.getRow(1).font = { bold: true, size: 13, color: { argb: 'FF1F4E79' } };
    wsCorp.addRow([]);

    const corpHeaders = [
      'S.No',
      'Corporation Name',
      'District',
      'On-Time Days',
      'Late Days',
      'Absent Days',
      'Compliance %',
      'Trend',
    ];
    wsCorp.addRow(corpHeaders);
    wsCorp.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsCorp.getRow(3).fill = HEADER_FILL;

    let cIdx = 1;
    for (const corp of corporations) {
      const entry = stats.get(corp.ulb_id) ?? { onTime: 0, late: 0, absent: 0 };
      const total = entry.onTime + entry.late + entry.absent;
      const compliancePct =
        total > 0 ? Math.round(((entry.onTime + entry.late) / total) * 100) : 0;
      const trend = compliancePct < 70 ? '⚠️ Low' : '✅ Good';

      wsCorp.addRow([
        cIdx++,
        corp.name,
        corp.district,
        entry.onTime,
        entry.late,
        entry.absent,
        `${compliancePct}%`,
        trend,
      ]);
    }
    wsCorp.columns.forEach((c) => {
      c.width = 18;
    });

    // SHEET 2: Regional Municipalities Monthly
    const wsMuni = wb.addWorksheet('Regional Municipalities Monthly');
    wsMuni.addRow([`7 REGIONS MUNICIPALITIES — MONTHLY PERFORMANCE (${yearMonth})`]);
    wsMuni.getRow(1).font = { bold: true, size: 13, color: { argb: 'FF1F4E79' } };
    wsMuni.addRow([]);

    const muniHeaders = [
      'S.No',
      'Region',
      'Municipality Name',
      'On-Time Days',
      'Late Days',
      'Absent Days',
      'Compliance %',
      'Trend',
    ];
    wsMuni.addRow(muniHeaders);
    wsMuni.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsMuni.getRow(3).fill = HEADER_FILL;

    let mIdx = 1;
    for (const regionName of OFFICIAL_REGIONS) {
      const regionMunis = municipalities.filter((m) => m.region === regionName);

      const groupBanner = wsMuni.addRow([
        `REGION: ${regionName.toUpperCase()} (${regionMunis.length} Municipalities)`,
      ]);
      groupBanner.font = { bold: true, color: { argb: 'FF1F4E79' } };
      groupBanner.fill = SECTION_FILL;
      wsMuni.mergeCells(`A${groupBanner.number}:H${groupBanner.number}`);

      for (const muni of regionMunis) {
        const entry = stats.get(muni.ulb_id) ?? {
          onTime: 0,
          late: 0,
          absent: 0,
        };
        const total = entry.onTime + entry.late + entry.absent;
        const compliancePct =
          total > 0 ? Math.round(((entry.onTime + entry.late) / total) * 100) : 0;
        const trend = compliancePct < 70 ? '⚠️ Low' : '✅ Good';

        wsMuni.addRow([
          mIdx++,
          regionName,
          muni.name,
          entry.onTime,
          entry.late,
          entry.absent,
          `${compliancePct}%`,
          trend,
        ]);
      }
      wsMuni.addRow([]);
    }

    wsMuni.columns.forEach((c) => {
      c.width = 18;
    });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ─── Store / retrieve ──────────────────────────────────────────────────────────

  async generateAndStoreDailyReport(date: string): Promise<void> {
    const buffer = await this.generateDailyReport(date);
    const key = `daily/${date}.xlsx`;
    await this.minioService.upload(
      this.bucket,
      key,
      buffer,
      buffer.length,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    this.logger.log(`Stored daily report at ${key}`);
  }

  async generateAndStoreMonthlyReport(yearMonth: string): Promise<void> {
    const buffer = await this.generateMonthlyReport(yearMonth);
    const key = `monthly/${yearMonth}.xlsx`;
    await this.minioService.upload(
      this.bucket,
      key,
      buffer,
      buffer.length,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    this.logger.log(`Stored monthly report at ${key}`);
  }

  async getDailyReportBuffer(date: string): Promise<Buffer> {
    const key = `daily/${date}.xlsx`;
    try {
      return await this.minioService.getObject(this.bucket, key);
    } catch {
      this.logger.warn(`Cache miss for daily report ${date}, generating…`);
      return this.generateDailyReport(date);
    }
  }

  async getMonthlyReportBuffer(yearMonth: string): Promise<Buffer> {
    const key = `monthly/${yearMonth}.xlsx`;
    try {
      return await this.minioService.getObject(this.bucket, key);
    } catch {
      this.logger.warn(
        `Cache miss for monthly report ${yearMonth}, generating…`,
      );
      return this.generateMonthlyReport(yearMonth);
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────────

  private async fetchSubmissionsForDate(date: string): Promise<SubmissionRow[]> {
    return this.dataSource.query<SubmissionRow[]>(
      `
      SELECT
        s.ulb_id,
        u.name        AS ulb_name,
        u.district,
        u.type        AS ulb_type,
        u.region,
        s.category_id,
        ic.name       AS category_name,
        s.status,
        s.submitted_at
      FROM submission s
      JOIN ulb u ON u.ulb_id = s.ulb_id
      JOIN inspection_category ic ON ic.category_id = s.category_id
      WHERE DATE(s.submitted_at AT TIME ZONE 'Asia/Kolkata') = $1
      `,
      [date],
    );
  }

  private async fetchSubmissionsForRange(
    start: Date,
    end: Date,
  ): Promise<SubmissionRow[]> {
    return this.dataSource.query<SubmissionRow[]>(
      `
      SELECT
        s.ulb_id,
        u.name        AS ulb_name,
        u.district,
        u.type        AS ulb_type,
        u.region,
        s.category_id,
        ic.name       AS category_name,
        s.status,
        s.submitted_at
      FROM submission s
      JOIN ulb u ON u.ulb_id = s.ulb_id
      JOIN inspection_category ic ON ic.category_id = s.category_id
      WHERE s.submitted_at BETWEEN $1 AND $2
      `,
      [start.toISOString(), end.toISOString()],
    );
  }

  private async fetchAllUlbs(): Promise<UlbRow[]> {
    return this.dataSource.query<UlbRow[]>(
      `SELECT ulb_id, name, district, type, region FROM ulb WHERE active = true ORDER BY name ASC`,
    );
  }

  private async fetchActiveCategories(): Promise<CategoryRow[]> {
    return this.dataSource.query<CategoryRow[]>(
      `SELECT category_id, name FROM inspection_category WHERE active = true ORDER BY display_order ASC, name ASC`,
    );
  }
}
