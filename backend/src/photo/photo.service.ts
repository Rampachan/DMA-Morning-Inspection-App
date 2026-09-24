import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { MinioService } from './minio.service';

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/octet-stream',
];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 78;

export interface UploadResult {
  fileKey: string;
  fileSizeBytes: number;
}

@Injectable()
export class PhotoService {
  private readonly logger = new Logger(PhotoService.name);
  private readonly bucket: string;
  private readonly signedUrlExpiry: number;

  constructor(
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>(
      'MINIO_SUBMISSIONS_BUCKET',
      this.configService.get<string>('MINIO_BUCKET', 'mcrs-photos'),
    );
    this.signedUrlExpiry = parseInt(
      this.configService.get<string>('MINIO_SIGNED_URL_EXPIRY_SECONDS', '3600'),
      10,
    );
  }

  /**
   * Validates, compresses with sharp, and uploads the photo to MinIO or local filesystem.
   * Returns the file key and compressed size.
   */
  async upload(
    file: Express.Multer.File,
    submissionId: string,
  ): Promise<UploadResult> {
    // Validate MIME type
    const isAllowed =
      file.mimetype.startsWith('image/') ||
      ALLOWED_MIMES.includes(file.mimetype) ||
      /\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname);

    if (!isAllowed) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Only image files are allowed.`,
      );
    }

    // Validate raw file size
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException(
        `File size ${file.size} exceeds the 20 MB limit.`,
      );
    }

    // Compress with sharp if possible, fallback to raw buffer
    let compressed: Buffer;
    try {
      compressed = await sharp(file.buffer)
        .resize(MAX_EDGE_PX, MAX_EDGE_PX, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat('jpeg', { quality: JPEG_QUALITY })
        .toBuffer();
    } catch (sharpErr: any) {
      this.logger.warn(
        `Sharp image processing skipped/failed: ${sharpErr?.message}. Using original buffer.`,
      );
      compressed = file.buffer;
    }

    const photoId = uuidv4();
    const fileKey = `submissions/${submissionId}/${photoId}.jpg`;

    // Attempt upload to MinIO with graceful fallback to local storage
    try {
      await this.minioService.upload(
        this.bucket,
        fileKey,
        compressed,
        compressed.length,
        'image/jpeg',
      );
      this.logger.log(`Photo uploaded to MinIO bucket [${this.bucket}]: ${fileKey}`);
    } catch (minioErr: any) {
      this.logger.warn(
        `MinIO upload failed (${minioErr?.message}). Falling back to local filesystem storage.`,
      );
      try {
        const localDir = path.join(process.cwd(), 'uploads', 'submissions', submissionId);
        await fs.promises.mkdir(localDir, { recursive: true });
        const localPath = path.join(localDir, `${photoId}.jpg`);
        await fs.promises.writeFile(localPath, compressed);
        this.logger.log(`Saved photo to local storage fallback: ${localPath}`);
      } catch (fsErr: any) {
        this.logger.error(`Failed to save photo locally: ${fsErr?.message}`);
      }
    }

    return { fileKey, fileSizeBytes: compressed.length };
  }

  /**
   * Returns a time-limited presigned URL or local API URL fallback for accessing a photo.
   */
  async getSignedUrl(fileKey: string): Promise<string> {
    try {
      return await this.minioService.presignedGet(
        this.bucket,
        fileKey,
        this.signedUrlExpiry,
      );
    } catch (err: any) {
      this.logger.warn(
        `MinIO presignedGet failed for ${fileKey}: ${err?.message}. Falling back to local photo URL.`,
      );
      return `/api/v1/photos/raw?key=${encodeURIComponent(fileKey)}`;
    }
  }

  /**
   * Retrieves photo buffer from local storage or MinIO for streaming.
   */
  async getPhotoBuffer(fileKey: string): Promise<{ buffer: Buffer; contentType: string }> {
    // 1. Try local disk
    const localPath = path.join(process.cwd(), 'uploads', fileKey);
    if (fs.existsSync(localPath)) {
      const buffer = await fs.promises.readFile(localPath);
      return { buffer, contentType: 'image/jpeg' };
    }

    // 2. Try MinIO
    try {
      const buffer = await this.minioService.getObject(this.bucket, fileKey);
      return { buffer, contentType: 'image/jpeg' };
    } catch (err: any) {
      this.logger.error(`Could not retrieve photo for key ${fileKey}: ${err?.message}`);
      throw new NotFoundException(`Photo not found: ${fileKey}`);
    }
  }

  /**
   * Deletes a photo from MinIO or local storage — used for cleanup or rollback.
   */
  async deleteObject(fileKey: string): Promise<void> {
    try {
      await this.minioService.delete(this.bucket, fileKey);
    } catch {
      // ignore
    }
    try {
      const localPath = path.join(process.cwd(), 'uploads', fileKey);
      if (fs.existsSync(localPath)) {
        await fs.promises.unlink(localPath);
      }
    } catch {
      // ignore
    }
  }
}
