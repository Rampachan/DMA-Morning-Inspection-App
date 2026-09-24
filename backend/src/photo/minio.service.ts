import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MinioService {
  private readonly s3: S3Client;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly configService: ConfigService) {
    const rawEndpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<string>('MINIO_PORT', '9000');
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');

    let endpointUrl = rawEndpoint;
    if (!endpointUrl.startsWith('http://') && !endpointUrl.startsWith('https://')) {
      const protocol = useSSL ? 'https://' : 'http://';
      endpointUrl = `${protocol}${rawEndpoint}${port && port !== '443' && port !== '80' ? `:${port}` : ''}`;
    }

    this.s3 = new S3Client({
      endpoint: endpointUrl,
      forcePathStyle: true,
      region: this.configService.get<string>('MINIO_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
  }

  async ensureBucketExists(bucket: string): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
        this.logger.log(`Created bucket: ${bucket}`);
      } catch (err: any) {
        this.logger.warn(`Could not create bucket ${bucket}: ${err?.message}`);
      }
    }
  }

  async upload(
    bucket: string,
    key: string,
    buffer: Buffer,
    size: number,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: size,
      }),
    );
  }

  async presignedGet(
    bucket: string,
    key: string,
    expirySeconds: number,
  ): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expirySeconds });
  }

  async delete(bucket: string, key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async getObject(bucket: string, key: string): Promise<Buffer> {
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const stream = response.Body as any;
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
