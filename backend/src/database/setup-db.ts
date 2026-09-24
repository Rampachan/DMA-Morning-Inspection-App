// @ts-ignore
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function setup() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || process.env.DB_PASS || 'postgres';
  const targetDb = process.env.DB_NAME || 'mcrs_db';

  console.log(`Connecting to PostgreSQL at ${host}:${port} as user "${user}"...`);

  // 1. Connect to default 'postgres' database
  const client = new Client({ host, port, user, password, database: 'postgres' });
  await client.connect();

  // Ensure password matches .env
  await client.query(`ALTER USER "${user}" WITH PASSWORD '${password}'`);
  console.log(`Password for "${user}" set to "${password}".`);

  // 2. Check if target database exists
  const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDb]);
  if (res.rows.length === 0) {
    console.log(`Creating database "${targetDb}"...`);
    await client.query(`CREATE DATABASE "${targetDb}"`);
    console.log(`Database "${targetDb}" created successfully.`);
  } else {
    console.log(`Database "${targetDb}" already exists.`);
  }
  await client.end();

  // 3. Connect to target database and enable PostGIS extension
  console.log(`Connecting to "${targetDb}" to enable PostGIS...`);
  const targetClient = new Client({ host, port, user, password, database: targetDb });
  await targetClient.connect();

  try {
    await targetClient.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    console.log(`PostGIS extension enabled in "${targetDb}".`);
  } catch (err: any) {
    console.warn(`PostGIS extension notice: ${err.message}`);
    console.warn(`(If PostGIS is not yet installed on your local machine, the app will still run gracefully with boundary checks skipped.)`);
  }

  await targetClient.end();
  console.log(`\nAll done! Database "${targetDb}" is ready.`);
}

setup().catch((err) => {
  console.error('\nDatabase setup failed:', err.message);
  process.exit(1);
});
