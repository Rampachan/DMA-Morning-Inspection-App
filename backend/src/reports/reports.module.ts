import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PhotoModule } from '../photo/photo.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PhotoModule, AuditLogModule],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
