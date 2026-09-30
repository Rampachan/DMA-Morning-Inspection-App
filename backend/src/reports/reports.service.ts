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
  'Madurai',
  'Thanjavur',
  'Tirunelveli',
  'Tiruppur',
  'Vellore',
  'Salem',
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

      let uploadStatus = 'Not Uploaded';
      if (hasLate) uploadStatus = 'Uploaded (Late)';
      else if (hasOnTime) uploadStatus = 'Uploaded (On-Time)';

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

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    // Format date string YYYY-MM-DD -> DD.MM.YYYY
    const dateParts = date.split('-');
    const formattedDate =
      dateParts.length === 3
        ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`
        : date;

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 1: Region Abstract (EXACT MATCH TO USER REFERENCE PDF)
    // ──────────────────────────────────────────────────────────────────────────
    const wsAbstract = wb.addWorksheet('Region Abstract');
    wsAbstract.views = [{ showGridLines: true }];

    // Row 1: Merged Title
    wsAbstract.mergeCells('A1:F1');
    const titleCell = wsAbstract.getCell('A1');
    titleCell.value =
      'Region Abstract - Municipal Commissioners Morning Inspection Status';
    titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFCC0000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    wsAbstract.getRow(1).height = 28;

    // Row 2: Date & Time of Verification info
    const row2 = wsAbstract.getRow(2);
    row2.height = 24;

    const cellA2 = wsAbstract.getCell('A2');
    cellA2.value = 'Date';
    cellA2.font = { name: 'Arial', size: 11, bold: true };
    cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellB2 = wsAbstract.getCell('B2');
    cellB2.value = formattedDate;
    cellB2.font = { name: 'Arial', size: 11, bold: true };
    cellB2.alignment = { horizontal: 'center', vertical: 'middle' };

    wsAbstract.mergeCells('C2:D2');
    const cellC2 = wsAbstract.getCell('C2');
    cellC2.value = 'Time of Verification';
    cellC2.font = { name: 'Arial', size: 11, bold: true };
    cellC2.alignment = { horizontal: 'center', vertical: 'middle' };

    wsAbstract.mergeCells('E2:F2');
    const cellE2 = wsAbstract.getCell('E2');
    cellE2.value = '5.45 Am to 7.30 Am';
    cellE2.font = { name: 'Arial', size: 11, bold: true };
    cellE2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: Headers
    const headers = [
      'S.No',
      'Region',
      'No of\nULBs',
      'No of ULBs\nuploaded\nthe photos',
      'No of ULBs\nnot uploaded\nthe photos',
      'Not Uploaded ULBs',
    ];
    const headerRow = wsAbstract.addRow(headers);
    headerRow.height = 40;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    // Rows 4 - 10: Regions Data
    let totalUlbsCount = 0;
    let totalUploadedCount = 0;
    let totalNotUploadedCount = 0;
    let rIdx = 1;

    for (const regionName of OFFICIAL_REGIONS) {
      const regionMunis = municipalities
        .filter((m) => m.region === regionName)
        .sort((a, b) => a.name.localeCompare(b.name));

      const totalCount = regionMunis.length;
      const uploadedMunis = regionMunis.filter((m) => getUlbStats(m).hasUploaded);
      const notUploadedMunis = regionMunis.filter((m) => !getUlbStats(m).hasUploaded);

      const uploadedCount = uploadedMunis.length;
      const notUploadedCount = notUploadedMunis.length;

      totalUlbsCount += totalCount;
      totalUploadedCount += uploadedCount;
      totalNotUploadedCount += notUploadedCount;

      const notUploadedText =
        notUploadedMunis.length === 0
          ? '-'
          : notUploadedMunis
              .map((m, i) => `${i + 1}.${m.name}`)
              .join('\n');

      const dataRow = wsAbstract.addRow([
        rIdx++,
        `${regionName} Region`,
        totalCount,
        uploadedCount,
        notUploadedCount,
        notUploadedText,
      ]);

      const lineCount = notUploadedMunis.length > 0 ? notUploadedMunis.length : 1;
      dataRow.height = Math.max(24, lineCount * 18 + 8);

      dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      dataRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.getCell(6).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

      dataRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
      });
    }

    // Row 11: Total Row
    const totalRow = wsAbstract.addRow([
      '',
      'Total',
      totalUlbsCount,
      totalUploadedCount,
      totalNotUploadedCount,
      '',
    ]);
    totalRow.height = 26;

    const totalFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2DCDB' },
    };

    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = totalFill;
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFCC0000' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Apply borders to all cells A1:F11
    for (let r = 1; r <= wsAbstract.rowCount; r++) {
      const row = wsAbstract.getRow(r);
      for (let c = 1; c <= 6; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
      }
    }

    wsAbstract.columns = [
      { width: 8 },  // S.No
      { width: 24 }, // Region
      { width: 12 }, // No of ULBs
      { width: 18 }, // No of ULBs uploaded the photos
      { width: 18 }, // No of ULBs not uploaded the photos
      { width: 36 }, // Not Uploaded ULBs
    ];

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 2: 24 Corporations
    // ──────────────────────────────────────────────────────────────────────────
    const wsCorp = wb.addWorksheet('24 Corporations');
    wsCorp.views = [{ showGridLines: true }];

    const corpTitle = wsCorp.addRow([
      `24 CORPORATIONS — DAILY COMPLIANCE STATUS (${formattedDate})`,
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

      const uploadedCell = row.getCell(5);
      uploadedCell.fill = stats.hasUploaded ? YES_FILL : NO_FILL;
      uploadedCell.font = { bold: true };

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
    // SHEET 3: Detailed Municipality Status
    // ──────────────────────────────────────────────────────────────────────────
    const wsMuni = wb.addWorksheet('Detailed Municipality Status');
    wsMuni.views = [{ showGridLines: true }];

    const muniTitle = wsMuni.addRow([
      `7 REGIONS MUNICIPALITIES — DETAILED STATUS (${formattedDate})`,
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

      const groupBanner = wsMuni.addRow([
        `REGION: ${regionName.toUpperCase()} — ${regionMunis.length} Municipalities (${rUploaded} Uploaded, ${regionMunis.length - rUploaded} Not Uploaded)`,
      ]);
      groupBanner.font = { bold: true, color: { argb: 'FF1F4E79' } };
      groupBanner.fill = SECTION_FILL;
      wsMuni.mergeCells(
        `A${groupBanner.number}:${String.fromCharCode(65 + 6 + categories.length)}${groupBanner.number}`,
      );

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

        const uploadedCell = row.getCell(5);
        uploadedCell.fill = stats.hasUploaded ? YES_FILL : NO_FILL;
        uploadedCell.font = { bold: true };

        categories.forEach((c, i) => {
          const s = stats.catMap.get(c.category_id)?.status;
          if (s && STATUS_FILL[s]) {
            row.getCell(6 + i).fill = STATUS_FILL[s];
          }
        });
      }
      wsMuni.addRow([]);
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
