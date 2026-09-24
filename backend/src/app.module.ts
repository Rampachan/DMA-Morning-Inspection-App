import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UlbModule } from './ulb/ulb.module';
import { InspectionCategoryModule } from './inspection-category/inspection-category.module';
import { SubmissionModule } from './submission/submission.module';
import { PhotoModule } from './photo/photo.module';
import { GeoModule } from './geo/geo.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { TasksModule } from './tasks/tasks.module';
import { AuditLogModule } from './audit-log/audit-log.module';

import { Ulb } from './database/entities/ulb.entity';
import { User } from './database/entities/user.entity';
import { InspectionCategory } from './database/entities/inspection-category.entity';
import { Submission } from './database/entities/submission.entity';
import { Photo } from './database/entities/photo.entity';
import { AuditLog } from './database/entities/audit-log.entity';

@Module({
  imports: [
    // ── Configuration ────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // ── Database ─────────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
        username: config.get<string>('DB_USER', 'mcrs'),
        password:
          config.get<string>('DB_PASSWORD') ||
          config.get<string>('DB_PASS', 'mcrs_secret'),
        database: config.get<string>('DB_NAME', 'mcrs_db'),
        ssl:
          config.get<string>('DB_SSL') === 'true' ||
          config.get<string>('DB_HOST', '').includes('supabase')
            ? { rejectUnauthorized: false }
            : false,
        entities: [Ulb, User, InspectionCategory, Submission, Photo, AuditLog],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // ── Rate limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: parseInt(config.get<string>('THROTTLE_TTL', '60000'), 10),
            limit: parseInt(config.get<string>('THROTTLE_LIMIT', '100'), 10),
          },
        ],
      }),
    }),

    // ── Scheduler ────────────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature Modules ───────────────────────────────────────────────────────
    AuditLogModule,
    AuthModule,
    UsersModule,
    UlbModule,
    InspectionCategoryModule,
    GeoModule,
    PhotoModule,
    SubmissionModule,
    NotificationsModule,
    ReportsModule,
    TasksModule,
  ],
  providers: [
    // Apply JwtAuthGuard globally; routes opt-out with @SkipAuth()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
