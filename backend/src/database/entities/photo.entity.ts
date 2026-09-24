import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Submission } from './submission.entity';

@Entity('photo')
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  photo_id!: string;

  @Column({ type: 'uuid' })
  submission_id!: string;

  @Column({ type: 'varchar' })
  file_key!: string;

  @Column({ type: 'double precision' })
  latitude!: number;

  @Column({ type: 'double precision' })
  longitude!: number;

  @Column({ type: 'timestamptz' })
  captured_at!: Date;

  @Column({ type: 'integer', nullable: true })
  file_size_bytes!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Submission, (submission) => submission.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission!: Submission;
}
