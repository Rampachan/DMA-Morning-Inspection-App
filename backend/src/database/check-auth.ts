// @ts-ignore
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const CANDIDATES = [
  { port: 5433, user: 'mcrs', pass: 'mcrs_secret', db: 'mcrs_db', desc: 'Docker Container (port 5433)' },
  { port: 5432, user: 'mcrs', pass: 'mcrs_secret', db: 'mcrs_db', desc: 'Docker Container (port 5432)' },
  { port: 5432, user: 'postgres', pass: 'postgres', db: 'postgres', desc: 'Default postgres' },
  { port: 5432, user: 'postgres', pass: 'admin', db: 'postgres', desc: 'admin' },
  { port: 5432, user: 'postgres', pass: 'root', db: 'postgres', desc: 'root' },
  { port: 5432, user: 'postgres', pass: '1234', db: 'postgres', desc: '1234' },
  { port: 5432, user: 'postgres', pass: '123456', db: 'postgres', desc: '123456' },
  { port: 5432, user: 'postgres', pass: 'password', db: 'postgres', desc: 'password' },
];

async function findWorkingAuth() {
  console.log('Testing connection combinations...\n');

  for (const c of CANDIDATES) {
    const client = new Client({
      host: 'localhost',
      port: c.port,
      user: c.user,
      password: c.pass,
      database: c.db,
      connectionTimeoutMillis: 1500,
    });

    try {
      await client.connect();
      console.log(`✅ SUCCESS! Connected to database using:`);
      console.log(`   Port:     ${c.port}`);
      console.log(`   User:     ${c.user}`);
      console.log(`   Password: ${c.pass}`);
      console.log(`   Source:   ${c.desc}`);
      await client.end();

      const envPath = path.resolve(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/DB_PORT=.*/, `DB_PORT=${c.port}`);
        envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${c.user}`);
        envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${c.pass}`);
        envContent = envContent.replace(/DB_NAME=.*/, `DB_NAME=${c.db}`);
        envContent = envContent.replace(
          /DATABASE_URL=.*/,
          `DATABASE_URL=postgresql://${c.user}:${c.pass}@localhost:${c.port}/${c.db}`
        );
        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log(`\nUpdated backend/.env with working credentials automatically!`);
      }
      return true;
    } catch (err: any) {
      if (err.code === '3D000') {
        console.log(`✅ SUCCESS! Credentials are valid on port ${c.port}:`);
        console.log(`   User:     ${c.user}`);
        console.log(`   Password: ${c.pass}`);
        await client.end().catch(() => {});

        const envPath = path.resolve(__dirname, '../../.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          envContent = envContent.replace(/DB_PORT=.*/, `DB_PORT=${c.port}`);
          envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${c.user}`);
          envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${c.pass}`);
          envContent = envContent.replace(/DB_NAME=.*/, `DB_NAME=${c.db}`);
          envContent = envContent.replace(
            /DATABASE_URL=.*/,
            `DATABASE_URL=postgresql://${c.user}:${c.pass}@localhost:${c.port}/${c.db}`
          );
          fs.writeFileSync(envPath, envContent, 'utf8');
          console.log(`\nUpdated backend/.env with working credentials!`);
        }
        return true;
      }
      console.log(`❌ port ${c.port} (${c.user}) — ${err.message}`);
    }
  }

  console.log('\nCould not connect.');
  return false;
}

findWorkingAuth().then((ok) => {
  if (ok) process.exit(0);
  else process.exit(1);
});
