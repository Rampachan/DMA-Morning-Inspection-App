import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { SubmissionModule } from '../submission/submission.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReportsModule } from '../reports/reports.module';
import { UlbModule } from '../ulb/ulb.module';
import { InspectionCategoryModule } from '../inspection-category/inspection-category.module';

@Module({
  imports: [
    SubmissionModule,
    NotificationsModule,
    ReportsModule,
    UlbModule,
    InspectionCategoryModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}
