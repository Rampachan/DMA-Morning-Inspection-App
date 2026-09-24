import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PhotoService } from './photo.service';
import { SkipAuth } from '../common/decorators/skip-auth.decorator';

@Controller('photos')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  /**
   * GET /api/v1/photos/raw?key=...
   * Public image streaming endpoint (fallback for local disk storage or direct streaming).
   */
  @Get('raw')
  @SkipAuth()
  @Header('Cache-Control', 'public, max-age=86400')
  async getRawPhoto(
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    if (!key) {
      throw new BadRequestException('Missing photo "key" query parameter.');
    }
    const { buffer, contentType } = await this.photoService.getPhotoBuffer(key);
    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  }
}
