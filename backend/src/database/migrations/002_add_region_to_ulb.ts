import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegionToUlb1000000000001 implements MigrationInterface {
  name = 'AddRegionToUlb1000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ulb" ADD COLUMN IF NOT EXISTS "region" VARCHAR`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ulb_region" ON "ulb" ("region")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ulb_region"`);
    await queryRunner.query(`ALTER TABLE "ulb" DROP COLUMN IF EXISTS "region"`);
  }
}
