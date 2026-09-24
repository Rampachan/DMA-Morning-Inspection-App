import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1000000000000 implements MigrationInterface {
  name = 'InitialSchema1000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    // ---- ENUMS ----
    await queryRunner.query(
      `CREATE TYPE "ulb_type_enum" AS ENUM ('corporation', 'municipality')`,
    );
    await queryRunner.query(
      `CREATE TYPE "role_enum" AS ENUM ('commissioner', 'admin', 'director')`,
    );
    await queryRunner.query(
      `CREATE TYPE "submission_status_enum" AS ENUM ('on_time', 'late', 'absent')`,
    );

    // ---- ULB ----
    await queryRunner.query(`
      CREATE TABLE "ulb" (
        "ulb_id"     UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"       VARCHAR       NOT NULL UNIQUE,
        "type"       "ulb_type_enum" NOT NULL,
        "district"   VARCHAR       NOT NULL,
        "geom"       geometry(Geometry,4326),
        "active"     BOOLEAN       NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ulb_district" ON "ulb" ("district")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ulb_geom" ON "ulb" USING GIST ("geom")`,
    );

    // ---- USERS ----
    await queryRunner.query(`
      CREATE TABLE "users" (
        "user_id"       UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"          VARCHAR       NOT NULL,
        "role"          "role_enum"   NOT NULL,
        "username"      VARCHAR       NOT NULL UNIQUE,
        "mobile"        VARCHAR,
        "password_hash" VARCHAR       NOT NULL,
        "ulb_id"        UUID          REFERENCES "ulb"("ulb_id") ON DELETE SET NULL,
        "active"        BOOLEAN       NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMPTZ,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_users_ulb_id" ON "users" ("ulb_id")`,
    );

    // Sentinel system user for automated tasks (e.g. absent records)
    await queryRunner.query(`
      INSERT INTO "users" ("user_id", "name", "role", "username", "password_hash", "active")
      VALUES ('00000000-0000-0000-0000-000000000000', 'System Automation', 'admin', 'system', '$2b$12$e8Y59lG2q3hH4R7D7J3EPe0.00000000000000000000000000000', false)
      ON CONFLICT ("user_id") DO NOTHING
    `);

    // ---- INSPECTION_CATEGORY ----
    await queryRunner.query(`
      CREATE TABLE "inspection_category" (
        "category_id"   UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"          VARCHAR NOT NULL UNIQUE,
        "active"        BOOLEAN NOT NULL DEFAULT true,
        "display_order" INTEGER NOT NULL DEFAULT 0
      )
    `);

    // ---- SUBMISSION ----
    await queryRunner.query(`
      CREATE TABLE "submission" (
        "submission_id"    UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
        "ulb_id"           UUID                     NOT NULL REFERENCES "ulb"("ulb_id"),
        "category_id"      UUID                     NOT NULL REFERENCES "inspection_category"("category_id"),
        "submitted_by"     UUID                     NOT NULL REFERENCES "users"("user_id"),
        "submitted_at"     TIMESTAMPTZ              NOT NULL,
        "device_timestamp" TIMESTAMPTZ              NOT NULL,
        "status"           "submission_status_enum" NOT NULL,
        "geo_flagged"      BOOLEAN                  NOT NULL DEFAULT false,
        "created_at"       TIMESTAMPTZ              NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_submission_ulb_cat_time"
        ON "submission" ("ulb_id", "category_id", "submitted_at")
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_submission_submitted_by" ON "submission" ("submitted_by")`,
    );

    // ---- PHOTO ----
    await queryRunner.query(`
      CREATE TABLE "photo" (
        "photo_id"        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
        "submission_id"   UUID        NOT NULL REFERENCES "submission"("submission_id") ON DELETE CASCADE,
        "file_key"        VARCHAR     NOT NULL,
        "latitude"        DOUBLE PRECISION NOT NULL,
        "longitude"       DOUBLE PRECISION NOT NULL,
        "captured_at"     TIMESTAMPTZ NOT NULL,
        "file_size_bytes" INTEGER,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_photo_submission_id" ON "photo" ("submission_id")`,
    );

    // ---- AUDIT_LOG ----
    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "log_id"   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
        "action"   VARCHAR     NOT NULL,
        "actor_id" UUID,
        "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "details"  JSONB
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_audit_action" ON "audit_log" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_timestamp" ON "audit_log" ("timestamp")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "photo"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submission"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inspection_category"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ulb"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "submission_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ulb_type_enum"`);
  }
}
