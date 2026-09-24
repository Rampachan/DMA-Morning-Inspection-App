import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import { Ulb } from '../entities/ulb.entity';
import { User } from '../entities/user.entity';
import { InspectionCategory } from '../entities/inspection-category.entity';
import { UlbType } from '../../common/enums/ulb-type.enum';
import { Role } from '../../common/enums/roles.enum';
import { AppDataSource } from '../data-source';

interface StructuredData {
  totalRegions: number;
  regions: Array<{
    name: string;
    municipalityCount: number;
    municipalities: string[];
  }>;
  totalCorporations: number;
  corporations: Array<{
    sNo: number;
    name: string;
    contact: string | null;
    mobile: string;
  }>;
}

export async function runSeed(dataSource: DataSource): Promise<void> {
  const ulbRepo = dataSource.getRepository(Ulb);
  const userRepo = dataSource.getRepository(User);
  const catRepo = dataSource.getRepository(InspectionCategory);

  // 1. Ensure region column exists
  await dataSource.query(
    'ALTER TABLE "ulb" ADD COLUMN IF NOT EXISTS "region" VARCHAR;',
  );

  // 2. Clear old dummy records if present
  await dataSource.query(
    `UPDATE "users" SET "ulb_id" = NULL WHERE "ulb_id" IN (SELECT "ulb_id" FROM "ulb" WHERE "name" LIKE 'Corporation %' OR "name" LIKE 'Municipality %');`,
  );
  await dataSource.query(
    `DELETE FROM "photo" WHERE "submission_id" IN (SELECT "submission_id" FROM "submission" WHERE "ulb_id" IN (SELECT "ulb_id" FROM "ulb" WHERE "name" LIKE 'Corporation %' OR "name" LIKE 'Municipality %'));`,
  );
  await dataSource.query(
    `DELETE FROM "submission" WHERE "ulb_id" IN (SELECT "ulb_id" FROM "ulb" WHERE "name" LIKE 'Corporation %' OR "name" LIKE 'Municipality %');`,
  );
  await dataSource.query(
    `DELETE FROM "ulb" WHERE "name" LIKE 'Corporation %' OR "name" LIKE 'Municipality %';`,
  );

  // 3. Load structured data
  const jsonPath = path.resolve(__dirname, 'ulb-structured.json');
  const rawJson = fs.readFileSync(jsonPath, 'utf8');
  const data: StructuredData = JSON.parse(rawJson);

  console.log(
    `[ULB Seed] Seeding ${data.totalCorporations} Corporations and Municipalities across ${data.totalRegions} Regions...`,
  );

  // 4. Seed 24 Corporations
  let corpInserted = 0;
  for (const corp of data.corporations) {
    const cleanName = corp.name.trim();
    let record = await ulbRepo.findOne({ where: { name: cleanName } });
    if (!record) {
      record = ulbRepo.create({
        name: cleanName,
        type: UlbType.CORPORATION,
        district: cleanName,
        region: null,
        active: true,
      });
      await ulbRepo.save(record);
      corpInserted++;
    } else {
      record.type = UlbType.CORPORATION;
      record.district = cleanName;
      record.region = null;
      record.active = true;
      await ulbRepo.save(record);
    }
  }
  console.log(`[ULB Seed] Processed ${data.corporations.length} Corporations (${corpInserted} newly created).`);

  // 5. Seed Municipalities under 7 Regions
  let muniInserted = 0;
  let totalMuniCount = 0;
  for (const region of data.regions) {
    for (const muni of region.municipalities) {
      totalMuniCount++;
      const cleanName = muni.trim().replace(/[,\.]$/, '').trim();
      let record = await ulbRepo.findOne({ where: { name: cleanName } });
      if (!record) {
        record = ulbRepo.create({
          name: cleanName,
          type: UlbType.MUNICIPALITY,
          district: region.name,
          region: region.name,
          active: true,
        });
        await ulbRepo.save(record);
        muniInserted++;
      } else {
        record.type = UlbType.MUNICIPALITY;
        record.district = region.name;
        record.region = region.name;
        record.active = true;
        await ulbRepo.save(record);
      }
    }
  }
  console.log(
    `[ULB Seed] Processed ${totalMuniCount} Municipalities across ${data.regions.length} Regions (${muniInserted} newly created).`,
  );

  // 6. Seed Inspection Categories
  const catCount = await catRepo.count();
  if (catCount === 0) {
    const categories: Partial<InspectionCategory>[] = [
      { name: 'Road Sweeping', active: true, display_order: 1 },
      { name: 'Public Toilet Inspection', active: true, display_order: 2 },
      { name: 'Park & Greenery Inspection', active: true, display_order: 3 },
      { name: 'Drainage & Sewerage', active: true, display_order: 4 },
      { name: 'Street Light Inspection', active: true, display_order: 5 },
    ];
    await catRepo.save(categories as InspectionCategory[]);
    console.log(`[Category Seed] Inserted ${categories.length} inspection categories.`);
  }

  // 7. Seed Initial Accounts (Admin, Director, Commissioners)
  const defaultAdmin = await userRepo.findOne({ where: { username: 'admin' } });
  if (!defaultAdmin) {
    const adminHash = await bcrypt.hash('Admin@123456', 12);
    await userRepo.save({
      name: 'State Administrator',
      role: Role.ADMIN,
      username: 'admin',
      mobile: '9876543210',
      password_hash: adminHash,
      ulb_id: null,
      active: true,
    });
    console.log(`[User Seed] Created default admin account (username: admin, password: Admin@123456)`);
  }

  const defaultDirector = await userRepo.findOne({ where: { username: 'director' } });
  if (!defaultDirector) {
    const directorHash = await bcrypt.hash('Director@123456', 12);
    await userRepo.save({
      name: 'DMA Director',
      role: Role.DIRECTOR,
      username: 'director',
      mobile: '9876543211',
      password_hash: directorHash,
      ulb_id: null,
      active: true,
    });
    console.log(`[User Seed] Created default director account (username: director, password: Director@123456)`);
  }

  // Assign commissioner1 to Madurai Corporation
  const maduraiCorp = await ulbRepo.findOne({ where: { name: 'Madurai' } });
  const defaultComm = await userRepo.findOne({ where: { username: 'commissioner1' } });
  if (!defaultComm && maduraiCorp) {
    const commHash = await bcrypt.hash('Comm@123456', 12);
    await userRepo.save({
      name: 'Commissioner Madurai Corporation',
      role: Role.COMMISSIONER,
      username: 'commissioner1',
      mobile: '6383564836',
      password_hash: commHash,
      ulb_id: maduraiCorp.ulb_id,
      active: true,
    });
    console.log(`[User Seed] Created sample commissioner account (username: commissioner1, password: Comm@123456, ULB: Madurai)`);
  } else if (defaultComm && maduraiCorp) {
    defaultComm.ulb_id = maduraiCorp.ulb_id;
    await userRepo.save(defaultComm);
  }

  // Create accounts for all 24 Corporations commissioners
  for (const corp of data.corporations) {
    const corpUlb = await ulbRepo.findOne({ where: { name: corp.name.trim() } });
    if (!corpUlb) continue;
    const username = `corp_${corp.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const exists = await userRepo.findOne({ where: { username } });
    if (!exists) {
      const passHash = await bcrypt.hash('Comm@123456', 12);
      await userRepo.save({
        name: corp.contact ? `Commissioner ${corp.name} (${corp.contact})` : `Commissioner ${corp.name}`,
        role: Role.COMMISSIONER,
        username,
        mobile: corp.mobile ? corp.mobile.replace(/\s+/g, '') : '9999999999',
        password_hash: passHash,
        ulb_id: corpUlb.ulb_id,
        active: true,
      });
    }
  }
}

// Standalone execution runner
if (require.main === module) {
  AppDataSource.initialize()
    .then(async (ds) => {
      console.log('Database connected. Running seeds...');
      await runSeed(ds);
      console.log('Seeding completed successfully.');
      await ds.destroy();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
