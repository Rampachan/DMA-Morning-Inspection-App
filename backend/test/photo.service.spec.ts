import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhotoService } from '../src/photo/photo.service';
import { MinioService } from '../src/photo/minio.service';

// ── Mocks ─────────────────────────────────────────────────────────────────────

/**
 * A minimal sharp mock that tracks calls and returns a fake compressed buffer.
 * We replace the 'sharp' module globally.
 */
const FAKE_COMPRESSED = Buffer.from('FAKE_JPEG');

const sharpInstance = {
  resize: jest.fn().mockReturnThis(),
  toFormat: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(FAKE_COMPRESSED),
};

jest.mock('sharp', () => jest.fn(() => sharpInstance));

const mockMinioService = {
  upload: jest.fn().mockResolvedValue(undefined),
  presignedGet: jest.fn().mockResolvedValue('https://signed-url.example.com'),
  delete: jest.fn().mockResolvedValue(undefined),
  ensureBucketExists: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn((key: string, def?: string) => {
    const map: Record<string, string> = {
      MINIO_SUBMISSIONS_BUCKET: 'mcrs-submissions',
      MINIO_SIGNED_URL_EXPIRY_SECONDS: '3600',
    };
    return map[key] ?? def ?? '';
  }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(
  mimetype: string,
  sizeBytes: number,
): Express.Multer.File {
  return {
    fieldname: 'photos',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype,
    size: sizeBytes,
    buffer: Buffer.alloc(sizeBytes, 0),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PhotoService', () => {
  let service: PhotoService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotoService,
        { provide: MinioService, useValue: mockMinioService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PhotoService>(PhotoService);
  });

  it('throws BadRequestException for a non-image MIME type (application/pdf)', async () => {
    const file = makeFile('application/pdf', 1024);

    await expect(service.upload(file, 'sub-id')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.upload(file, 'sub-id')).rejects.toThrow(
      /Invalid file type/,
    );
  });

  it('throws BadRequestException when file exceeds 20 MB', async () => {
    const TWENTY_MB_PLUS_ONE = 20 * 1024 * 1024 + 1;
    const file = makeFile('image/jpeg', TWENTY_MB_PLUS_ONE);

    await expect(service.upload(file, 'sub-id')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.upload(file, 'sub-id')).rejects.toThrow(
      /20 MB limit/,
    );
  });

  it('accepts a valid JPEG and calls sharp for compression', async () => {
    const file = makeFile('image/jpeg', 1024 * 1024); // 1 MB

    const result = await service.upload(file, 'sub-id');

    // Sharp should have been called
    const sharpMock = jest.requireMock<jest.Mock>('sharp');
    expect(sharpMock).toHaveBeenCalledWith(file.buffer);
    expect(sharpInstance.resize).toHaveBeenCalledWith(1600, 1600, {
      fit: 'inside',
      withoutEnlargement: true,
    });
    expect(sharpInstance.toFormat).toHaveBeenCalledWith('jpeg', {
      quality: 78,
    });
    expect(sharpInstance.toBuffer).toHaveBeenCalled();

    // MinIO upload should have been called
    expect(mockMinioService.upload).toHaveBeenCalledWith(
      'mcrs-submissions',
      expect.stringMatching(/^submissions\/sub-id\/.+\.jpg$/),
      FAKE_COMPRESSED,
      FAKE_COMPRESSED.length,
      'image/jpeg',
    );

    // Return value
    expect(result.fileKey).toMatch(/^submissions\/sub-id\/.+\.jpg$/);
    expect(result.fileSizeBytes).toBe(FAKE_COMPRESSED.length);
  });

  it('accepts a valid PNG and processes it the same way', async () => {
    const file = makeFile('image/png', 512 * 1024); // 512 KB

    await expect(service.upload(file, 'sub-id')).resolves.not.toThrow();
    expect(mockMinioService.upload).toHaveBeenCalled();
  });

  it('getSignedUrl returns a presigned URL from MinIO', async () => {
    const url = await service.getSignedUrl('submissions/sub-id/photo.jpg');

    expect(mockMinioService.presignedGet).toHaveBeenCalledWith(
      'mcrs-submissions',
      'submissions/sub-id/photo.jpg',
      3600,
    );
    expect(url).toBe('https://signed-url.example.com');
  });

  it('deleteObject calls MinIO delete', async () => {
    await service.deleteObject('submissions/sub-id/photo.jpg');

    expect(mockMinioService.delete).toHaveBeenCalledWith(
      'mcrs-submissions',
      'submissions/sub-id/photo.jpg',
    );
  });
});
