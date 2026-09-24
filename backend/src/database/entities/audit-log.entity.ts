import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  log_id!: string;

  @Index()
  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'uuid', nullable: true })
  actor_id!: string | null;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp!: Date;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;
}
