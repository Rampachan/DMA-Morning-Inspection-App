import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UlbType } from '../../common/enums/ulb-type.enum';
import { User } from './user.entity';
import { Submission } from './submission.entity';

@Entity('ulb')
export class Ulb {
  @PrimaryGeneratedColumn('uuid')
  ulb_id!: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  name!: string;

  @Column({
    type: 'enum',
    enum: UlbType,
  })
  type!: UlbType;

  @Column({ type: 'varchar', nullable: false })
  district!: string;

  @Column({ type: 'varchar', nullable: true })
  region!: string | null;

  /**
   * PostGIS geometry column. Stored as geography(Geometry,4326).
   * We use raw SQL for spatial queries via DataSource.query().
   */
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Geometry',
    srid: 4326,
    nullable: true,
  })
  geom!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @OneToMany(() => User, (user) => user.ulb)
  users!: User[];

  @OneToMany(() => Submission, (submission) => submission.ulb)
  submissions!: Submission[];
}
