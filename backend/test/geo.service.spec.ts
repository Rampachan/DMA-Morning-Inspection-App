import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GeoService } from '../src/geo/geo.service';

// ── Mock DataSource ───────────────────────────────────────────────────────────

const mockDataSource = {
  query: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultVal?: string) => {
    if (key === 'GEO_TOLERANCE_METERS') return '200';
    return defaultVal ?? '';
  }),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GeoService', () => {
  let service: GeoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GeoService>(GeoService);
    jest.clearAllMocks();
  });

  it('returns { valid: true, skipped: true } when the ULB geom column is NULL', async () => {
    mockDataSource.query.mockResolvedValue([
      { geom_is_null: true, within: null },
    ]);

    const result = await service.validatePhotoLocation(
      'ulb-uuid',
      13.082680,
      80.270721,
    );

    expect(result).toEqual({ valid: true, skipped: true });
  });

  it('returns { valid: true, skipped: false } when the point is within the boundary', async () => {
    mockDataSource.query.mockResolvedValue([
      { geom_is_null: false, within: true },
    ]);

    const result = await service.validatePhotoLocation(
      'ulb-uuid',
      13.082680,
      80.270721,
    );

    expect(result).toEqual({ valid: true, skipped: false });
  });

  it('returns { valid: false, skipped: false } when the point is outside the boundary', async () => {
    mockDataSource.query.mockResolvedValue([
      { geom_is_null: false, within: false },
    ]);

    const result = await service.validatePhotoLocation(
      'ulb-uuid',
      12.000000,
      77.000000,
    );

    expect(result).toEqual({ valid: false, skipped: false });
  });

  it('returns { valid: true, skipped: true } when the ULB is not found in the DB', async () => {
    mockDataSource.query.mockResolvedValue([]);

    const result = await service.validatePhotoLocation(
      'nonexistent-uuid',
      13.082680,
      80.270721,
    );

    expect(result).toEqual({ valid: true, skipped: true });
  });

  it('passes longitude as the first positional argument to ST_MakePoint', async () => {
    mockDataSource.query.mockResolvedValue([
      { geom_is_null: false, within: true },
    ]);

    const lat = 13.082680;
    const lng = 80.270721;

    await service.validatePhotoLocation('ulb-uuid', lat, lng);

    const [_sql, params] = mockDataSource.query.mock.calls[0] as [
      string,
      [number, number, number, string],
    ];

    // ST_MakePoint(lng, lat) — longitude first
    expect(params[0]).toBe(lng);
    expect(params[1]).toBe(lat);
    // Tolerance
    expect(params[2]).toBe(200);
  });
});
