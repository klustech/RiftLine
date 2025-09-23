import { Client } from "pg";
import { getDatabaseUrl } from "./config";

async function run() {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  await client.query(`
    INSERT INTO analytics_events (topic, wallet, payload)
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
  `, [
    "seed",
    "system:analytics",
    JSON.stringify({ seededAt: new Date().toISOString() })
  ]);

  await client.end();
  console.log("Seed complete");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
