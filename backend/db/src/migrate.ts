import { promises as fs } from "fs";
import path from "path";
import { Client } from "pg";
import { getDatabaseUrl } from "./config";

async function ensureTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS data_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
}

async function applyMigration(client: Client, filePath: string, name: string) {
  const sql = await fs.readFile(filePath, "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO data_migrations(name) VALUES($1)", [name]);
    await client.query("COMMIT");
    console.log(`Applied migration ${name}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`Failed migration ${name}`, err);
    throw err;
  }
}

async function run() {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  await ensureTable(client);

  const migrationsDir = path.resolve(process.cwd(), "backend", "db", "migrations");
  const entries = await fs.readdir(migrationsDir);
  const files = entries.filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const { rows } = await client.query("SELECT 1 FROM data_migrations WHERE name = $1", [file]);
    if (rows.length) {
      continue;
    }
    await applyMigration(client, path.join(migrationsDir, file), file);
  }

  await client.end();
  console.log("Database migrations complete");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
