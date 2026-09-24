import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  /**
   * Inserts an audit log row. Never throws — errors are swallowed so that
   * audit failures never break the main request flow.
   */
  async log(
    action: string,
    actorId: string | null,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const entry = this.auditLogRepo.create({
        action,
        actor_id: actorId,
        details: details ?? null,
      });
      await this.auditLogRepo.save(entry);
    } catch (err) {
      // Swallow — audit must not break business logic
      this.logger.error(`Failed to write audit log [${action}]`, err);
    }
  }

  async findAll(
    page = 1,
    limit = 50,
  ): Promise<PaginatedAuditLogs> {
    const safeLimit = Math.min(limit, 200);
    const offset = (page - 1) * safeLimit;

    const [data, total] = await this.auditLogRepo.findAndCount({
      order: { timestamp: 'DESC' },
      skip: offset,
      take: safeLimit,
    });

    return { data, total, page, limit: safeLimit };
  }
}
