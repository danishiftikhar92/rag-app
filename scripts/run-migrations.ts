import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'raguser',
    password: process.env.DB_PASSWORD || 'ragpass',
    database: process.env.DB_NAME || 'ragdb',
  });

  let retries = 10;
  while (retries > 0) {
    try {
      await client.connect();
      console.log('Connected to PostgreSQL');
      break;
    } catch (err) {
      retries--;
      console.log(`Waiting for PostgreSQL... (${retries} retries left)`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  if (retries === 0) {
    console.error('Could not connect to PostgreSQL');
    process.exit(1);
  }

  const migrationsDir = path.join(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Running migration: ${file}`);
    await client.query(sql);
    console.log(`Migration complete: ${file}`);
  }

  await client.end();
  console.log('All migrations complete');
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
