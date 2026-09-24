import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../../common/enums/roles.enum';
import { Ulb } from './ulb.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id!: string;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'enum', enum: Role })
  role!: Role;

  @Column({ type: 'varchar', unique: true, nullable: false })
  username!: string;

  @Column({ type: 'varchar', nullable: true })
  mobile!: string | null;

  /** Never returned in responses — selected only for authentication. */
  @Column({ type: 'varchar', select: false, nullable: false })
  password_hash!: string;

  @Column({ type: 'uuid', nullable: true })
  ulb_id!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Ulb, (ulb) => ulb.users, { nullable: true })
  @JoinColumn({ name: 'ulb_id' })
  ulb!: Ulb | null;
}
