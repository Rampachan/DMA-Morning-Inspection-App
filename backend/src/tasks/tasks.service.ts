import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubmissionService } from '../submission/submission.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReportsService } from '../reports/reports.service';
import { UlbService } from '../ulb/ulb.service';
import { InspectionCategoryService } from '../inspection-category/inspection-category.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly submissionService: SubmissionService,
    private readonly notificationsService: NotificationsService,
    private readonly reportsService: ReportsService,
    private readonly ulbService: UlbService,
    private readonly categoryService: InspectionCategoryService,
  ) {}

  private get isTest(): boolean {
    return process.env['NODE_ENV'] === 'test';
  }

  private todayIST(): string {
    // Shift UTC → IST (UTC+5:30) then format as YYYY-MM-DD
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().split('T')[0];
  }

  /**
   * 06:45 IST — Send reminder to ULBs that haven't submitted yet.
   * Cron is in UTC: 06:45 IST = 01:15 UTC
   */
  @Cron('15 1 * * *', { name: 'remindJob' })
  async remindJob(): Promise<void> {
    if (this.isTest) return;
    this.logger.log('[CRON] remindJob started');

    try {
      const today = this.todayIST();
      const allUlbs = await this.ulbService.findActive();
      const allUlbIds = allUlbs.map((u) => u.ulb_id);
      const missingIds = await this.submissionService.getUlbsWithNoSubmission(
        today,
        allUlbIds,
      );
      await this.notificationsService.sendReminder(missingIds);
      this.logger.log(`[CRON] remindJob: reminded ${missingIds.length} ULBs`);
    } catch (err) {
      this.logger.error('[CRON] remindJob failed', err);
    }
  }

  /**
   * 07:35 IST — Insert ABSENT rows and send escalation.
   * 07:35 IST = 02:05 UTC
   */
  @Cron('5 2 * * *', { name: 'escalationJob' })
  async escalationJob(): Promise<void> {
    if (this.isTest) return;
    this.logger.log('[CRON] escalationJob started');

    try {
      const today = this.todayIST();
      const allUlbs = await this.ulbService.findActive();
      const allUlbIds = allUlbs.map((u) => u.ulb_id);
      const missingIds = await this.submissionService.getUlbsWithNoSubmission(
        today,
        allUlbIds,
      );

      const categories = await this.categoryService.findActive();
      const categoryIds = categories.map((c) => c.category_id);

      await this.submissionService.insertAbsentRows(today, missingIds, categoryIds);
      await this.notificationsService.sendEscalation(missingIds);

      this.logger.log(
        `[CRON] escalationJob: ${missingIds.length} absent ULBs processed`,
      );
    } catch (err) {
      this.logger.error('[CRON] escalationJob failed', err);
    }
  }

  /**
   * 07:30 IST — Generate and store daily report.
   * 07:30 IST = 02:00 UTC
   */
  @Cron('0 2 * * *', { name: 'dailyReportJob' })
  async dailyReportJob(): Promise<void> {
    if (this.isTest) return;
    this.logger.log('[CRON] dailyReportJob started');

    try {
      const today = this.todayIST();
      await this.reportsService.generateAndStoreDailyReport(today);
      this.logger.log(`[CRON] dailyReportJob: report stored for ${today}`);
    } catch (err) {
      this.logger.error('[CRON] dailyReportJob failed', err);
    }
  }

  /**
   * 1st of each month at 08:00 IST — Generate prior-month report.
   * 08:00 IST = 02:30 UTC
   */
  @Cron('30 2 1 * *', { name: 'monthlyReportJob' })
  async monthlyReportJob(): Promise<void> {
    if (this.isTest) return;
    this.logger.log('[CRON] monthlyReportJob started');

    try {
      // Prior month relative to today in IST
      const today = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
      const priorMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const yearMonth = `${priorMonth.getFullYear()}-${String(priorMonth.getMonth() + 1).padStart(2, '0')}`;

      await this.reportsService.generateAndStoreMonthlyReport(yearMonth);
      this.logger.log(`[CRON] monthlyReportJob: report stored for ${yearMonth}`);
    } catch (err) {
      this.logger.error('[CRON] monthlyReportJob failed', err);
    }
  }
}
