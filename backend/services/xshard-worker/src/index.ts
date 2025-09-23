import fetch from "node-fetch";
import { Pool } from "pg";

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const nakamaUrl = process.env.NAKAMA_URL ?? "http://localhost:7350/v2/rpc/riftline_transfer";

async function finalizeTransfers() {
  const { rows } = await db.query(
    'select id, wallet, "toShard" as "toServer" from "TravelTicket" where status = $1 limit 50',
    ['pending']
  );

  for (const ticket of rows) {
    try {
      await db.query('update "TravelTicket" set status = $1 where id = $2', [
        'finalized',
        ticket.id
      ]);
      await db.query(
        'insert into "TravelAudit"(wallet, "toServer", status, meta) values($1, $2, $3, $4)',
        [ticket.wallet, ticket.toServer, 'finalized', {}]
      );
      await fetch(nakamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: JSON.stringify({ wallet: ticket.wallet, to: ticket.toServer }) })
      });
    } catch (err) {
      console.warn('failed to finalize travel ticket %s', ticket.id, err);
      await db.query('update "TravelTicket" set status = $1 where id = $2', ['failed', ticket.id]);
    }
  }
}

setInterval(() => {
  finalizeTransfers().catch((err) => console.error('worker loop error', err));
}, 1500);
