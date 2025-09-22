import axios from "axios";
import { Pool } from "pg";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const databaseUrl = process.env.DATABASE_URL;
const nakamaRpcUrl = process.env.NAKAMA_RPC_URL;
if (!databaseUrl) throw new Error("DATABASE_URL required");
if (!nakamaRpcUrl) logger.warn("NAKAMA_RPC_URL not set; worker will not notify sessions");

const db = new Pool({ connectionString: databaseUrl });
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 2000);

async function processTickets() {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `select id, wallet, "fromShard", "toShard"
         from "TravelTicket"
        where status = 'pending'
        order by "createdAt" asc
        limit 20
        for update skip locked`
    );
    if (rows.length === 0) {
      await client.query("COMMIT");
      return;
    }

    for (const row of rows) {
      try {
        if (nakamaRpcUrl) {
          await axios.post(`${nakamaRpcUrl}/transfer`, {
            wallet: row.wallet,
            fromShard: row.fromShard,
            toShard: row.toShard
          });
        }
        await client.query(
          `update "TravelTicket" set status = 'finalized', "updatedAt" = now()
            where id = $1`,
          [row.id]
        );
        logger.info({ id: row.id, wallet: row.wallet }, "travel finalized");
      } catch (err) {
        await client.query(
          `update "TravelTicket" set status = 'failed', "updatedAt" = now()
             where id = $1`,
          [row.id]
        );
        logger.error({ err, id: row.id }, "failed to finalize travel ticket");
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "ticket processing error");
  } finally {
    client.release();
  }
}

async function main() {
  setInterval(processTickets, POLL_INTERVAL_MS);
  logger.info({ interval: POLL_INTERVAL_MS }, "cross-shard worker running");
}

main().catch((err) => {
  logger.error({ err }, "worker startup failed");
  process.exit(1);
});
