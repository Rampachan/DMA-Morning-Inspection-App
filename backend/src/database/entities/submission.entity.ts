import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubmissionStatus } from '../../common/enums/submission-status.enum';
import { Ulb } from './ulb.entity';
import { InspectionCategory } from './inspection-category.entity';
import { User } from './user.entity';
import { Photo } from './photo.entity';

@Entity('submission')
@Index(['ulb_id', 'category_id', 'submitted_at'])
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  submission_id!: string;

  @Column({ type: 'uuid' })
  ulb_id!: string;

  @Column({ type: 'uuid' })
  category_id!: string;

  @Column({ type: 'uuid' })
  submitted_by!: string;

  @Column({ type: 'timestamptz' })
  submitted_at!: Date;

  @Column({ type: 'timestamptz' })
  device_timestamp!: Date;

  @Column({ type: 'enum', enum: SubmissionStatus })
  status!: SubmissionStatus;

  @Column({ type: 'boolean', default: false })
  geo_flagged!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Ulb, (ulb) => ulb.submissions)
  @JoinColumn({ name: 'ulb_id' })
  ulb!: Ulb;

  @ManyToOne(() => InspectionCategory)
  @JoinColumn({ name: 'category_id' })
  category!: InspectionCategory;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'submitted_by' })
  user!: User;

  @OneToMany(() => Photo, (photo) => photo.submission, { cascade: true })
  photos!: Photo[];
}
