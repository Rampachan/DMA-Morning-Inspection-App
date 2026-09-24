import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('reports')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.DIRECTOR)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * GET /api/v1/reports/daily?date=YYYY-MM-DD
   * Streams the daily XLSX report as a file attachment.
   */
  @Get('daily')
  async getDailyReport(
    @Query('date') date: string,
    @Res() res: Response,
    @CurrentUser() actor: JwtPayload,
  ) {
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const buffer = await this.reportsService.getDailyReportBuffer(targetDate);

    void this.auditLogService.log('report.download.daily', actor.sub, {
      date: targetDate,
    });

    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="daily_report_${targetDate}.xlsx"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  /**
   * GET /api/v1/reports/monthly?month=YYYY-MM
   * Streams the monthly XLSX report as a file attachment.
   */
  @Get('monthly')
  async getMonthlyReport(
    @Query('month') month: string,
    @Res() res: Response,
    @CurrentUser() actor: JwtPayload,
  ) {
    const targetMonth =
      month ??
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      })();

    const buffer = await this.reportsService.getMonthlyReportBuffer(targetMonth);

    void this.auditLogService.log('report.download.monthly', actor.sub, {
      month: targetMonth,
    });

    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="monthly_report_${targetMonth}.xlsx"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
