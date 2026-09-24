import { Module } from '@nestjs/common';
import { PhotoService } from './photo.service';
import { MinioService } from './minio.service';
import { PhotoController } from './photo.controller';

@Module({
  controllers: [PhotoController],
  providers: [PhotoService, MinioService],
  exports: [PhotoService, MinioService],
})
export class PhotoModule {}
