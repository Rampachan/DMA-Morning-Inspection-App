import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SubmissionService } from '../src/submission/submission.service';
import { Submission } from '../src/database/entities/submission.entity';
import { Photo } from '../src/database/entities/photo.entity';
import { SubmissionStatus } from '../src/common/enums/submission-status.enum';
import { GeoService } from '../src/geo/geo.service';
import { PhotoService } from '../src/photo/photo.service';
import { AuditLogService } from '../src/audit-log/audit-log.service';

// ── Minimal mocks so the service can be instantiated ─────────────────────────

const mockRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
const mockDataSource = { transaction: jest.fn(), query: jest.fn() };

const mockDeps = {
  geoService: { validatePhotoLocation: jest.fn() },
  photoService: { upload: jest.fn(), getSignedUrl: jest.fn() },
  auditLogService: { log: jest.fn() },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SubmissionService.determineStatus()', () => {
  let service: SubmissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionService,
        { provide: getRepositoryToken(Submission), useValue: mockRepo },
        { provide: getRepositoryToken(Photo), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: GeoService, useValue: mockDeps.geoService },
        { provide: PhotoService, useValue: mockDeps.photoService },
        { provide: AuditLogService, useValue: mockDeps.auditLogService },
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
  });

  /**
   * Helper: build a Date at the given IST hour:minute.
   * IST = UTC + 5h30m, so IST 06:00 === UTC 00:30
   */
  function istTime(hour: number, minute: number): Date {
    // IST offset in ms
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    // Create UTC time that corresponds to desired IST time
    const utcMs =
      Date.UTC(2024, 8, 9, 0, 0, 0, 0) + // arbitrary date base
      (hour * 60 + minute) * 60 * 1000 -
      istOffsetMs;
    return new Date(utcMs);
  }

  it('06:00 IST → ON_TIME', () => {
    expect(service.determineStatus(istTime(6, 0))).toBe(
      SubmissionStatus.ON_TIME,
    );
  });

  it('07:29 IST → ON_TIME', () => {
    expect(service.determineStatus(istTime(7, 29))).toBe(
      SubmissionStatus.ON_TIME,
    );
  });

  it('07:30 IST → ON_TIME (inclusive boundary)', () => {
    expect(service.determineStatus(istTime(7, 30))).toBe(
      SubmissionStatus.ON_TIME,
    );
  });

  it('07:31 IST → LATE', () => {
    expect(service.determineStatus(istTime(7, 31))).toBe(
      SubmissionStatus.LATE,
    );
  });

  it('08:00 IST → LATE', () => {
    expect(service.determineStatus(istTime(8, 0))).toBe(
      SubmissionStatus.LATE,
    );
  });

  it('04:59 IST → LATE (before window opens)', () => {
    expect(service.determineStatus(istTime(4, 59))).toBe(
      SubmissionStatus.LATE,
    );
  });

  it('05:00 IST → ON_TIME (window open boundary)', () => {
    expect(service.determineStatus(istTime(5, 0))).toBe(
      SubmissionStatus.ON_TIME,
    );
  });
});
