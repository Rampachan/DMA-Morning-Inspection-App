import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from '../database/entities/submission.entity';
import { Photo } from '../database/entities/photo.entity';
import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';
import { GeoModule } from '../geo/geo.module';
import { PhotoModule } from '../photo/photo.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Photo]),
    GeoModule,
    PhotoModule,
    AuditLogModule,
  ],
  providers: [SubmissionService],
  controllers: [SubmissionController],
  exports: [SubmissionService],
})
export class SubmissionModule {}
