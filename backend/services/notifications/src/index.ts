import admin from "firebase-admin";
import { Pool } from "pg";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL required");

const db = new Pool({ connectionString: databaseUrl });
let firebaseReady = false;

try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
  firebaseReady = true;
} catch (err) {
  logger.warn({ err }, "firebase admin not initialized; notifications disabled");
}

export async function pushAuctionReminder(auctionId: number, minutesBefore: number) {
  if (!firebaseReady) return;
  const { rows } = await db.query(
    `select aw.wallet, p."pushToken"
       from "AuctionWatch" aw
       join "Player" p on p.wallet = aw.wallet
      where aw."auctionId" = $1
        and p."pushToken" is not null`,
    [auctionId]
  );
  for (const row of rows) {
    await admin.messaging().send({
      token: row.pushToken,
      notification: {
        title: "Auction ending soon",
        body: `Auction #${auctionId} ends in ${minutesBefore} minutes`
      }
    });
  }
}

if (require.main === module) {
  logger.info("notifications service ready");
}
