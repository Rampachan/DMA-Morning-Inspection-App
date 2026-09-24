import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Ulb } from './entities/ulb.entity';
import { User } from './entities/user.entity';
import { InspectionCategory } from './entities/inspection-category.entity';
import { Submission } from './entities/submission.entity';
import { Photo } from './entities/photo.entity';
import { AuditLog } from './entities/audit-log.entity';
import { InitialSchema1000000000000 } from './migrations/001_initial_schema';
import { AddRegionToUlb1000000000001 } from './migrations/002_add_region_to_ulb';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'mcrs_db',
  ssl:
    process.env.DB_SSL === 'true' ||
    (process.env.DB_HOST && process.env.DB_HOST.includes('supabase'))
      ? { rejectUnauthorized: false }
      : false,
  entities: [Ulb, User, InspectionCategory, Submission, Photo, AuditLog],
  migrations: [InitialSchema1000000000000, AddRegionToUlb1000000000001],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
