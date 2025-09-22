import { ethers } from "ethers";
import { Pool } from "pg";
import pino from "pino";
import fs from "fs";
import path from "path";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const rpcUrl = process.env.RPC_URL;
const databaseUrl = process.env.DATABASE_URL;
if (!rpcUrl) throw new Error("RPC_URL required");
if (!databaseUrl) throw new Error("DATABASE_URL required");

function loadAddress(key: string): string {
  const envKey = `${key.toUpperCase()}_ADDRESS`;
  if (process.env[envKey]) return process.env[envKey]!;
  const deploymentFile = process.env.RIFTLINE_DEPLOYMENTS
    ?? path.resolve(process.cwd(), "chain", "deployments", `${process.env.RIFTLINE_NETWORK ?? "local"}.json`);
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file missing; set ${envKey} or RIFTLINE_DEPLOYMENTS`);
  }
  const data = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  if (!data[key]) throw new Error(`Missing ${key} in deployment file`);
  return data[key];
}

const rentAuctionAddress = loadAddress("RentAuction");

const rentAuctionAbi = [
  "event LotCreated(uint256 indexed lotId,uint256 tokenId,uint64 start,uint64 end,uint64 leaseSeconds,uint96 reserve)",
  "event Bid(uint256 indexed lotId,address bidder,uint96 amount,uint64 newEnd)",
  "event Settled(uint256 indexed lotId,address winner,uint96 amount,uint64 leaseUntil)",
  "function lots(uint256) view returns (uint256 tokenId,uint64 startTime,uint64 endTime,uint64 leaseSeconds,uint96 reserve,uint96 minIncrement,address highBidder,uint96 highBid)",
  "function totalLots() view returns (uint256)",
  "function rft() view returns (address)"
];

const provider = new ethers.JsonRpcProvider(rpcUrl);
const db = new Pool({ connectionString: databaseUrl });
const auction = new ethers.Contract(rentAuctionAddress, rentAuctionAbi, provider);

async function ensureSchema() {
  await db.query(`
    create table if not exists auction_state (
      id integer primary key,
      asset text not null,
      token_id integer not null,
      pay_token text not null,
      start_time timestamptz not null,
      end_time timestamptz not null,
      lease_seconds integer not null,
      reserve numeric not null,
      min_increment numeric not null,
      highest_bidder text,
      highest_bid numeric default 0,
      settled boolean default false,
      lease_end timestamptz,
      updated_at timestamptz default now()
    );
  `);
  await db.query(`
    create table if not exists auction_bid (
      id serial primary key,
      auction_id integer not null,
      wallet text not null,
      amount numeric not null,
      tx_hash text,
      created_at timestamptz default now()
    );
  `);
}

async function upsertAuctionState(id: number) {
  const lot = await auction.lots(id);
  await db.query(
    `insert into auction_state (
      id, asset, token_id, pay_token, start_time, end_time, lease_seconds, reserve, min_increment, highest_bidder, highest_bid, settled, lease_end, updated_at
    ) values ($1,$2,$3,$4,to_timestamp($5),to_timestamp($6),$7,$8,$9,$10,$11,$12,$13,now())
    on conflict (id) do update set
      token_id = excluded.token_id,
      pay_token = excluded.pay_token,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      lease_seconds = excluded.lease_seconds,
      reserve = excluded.reserve,
      min_increment = excluded.min_increment,
      highest_bidder = excluded.highest_bidder,
      highest_bid = excluded.highest_bid,
      settled = excluded.settled,
      lease_end = excluded.lease_end,
      updated_at = now()
    `,
    [
      id,
      "license",
      Number(lot.tokenId),
      await auction.rft(),
      Number(lot.startTime),
      Number(lot.endTime),
      Number(lot.leaseSeconds),
      lot.reserve.toString(),
      lot.minIncrement.toString(),
      lot.highBidder,
      lot.highBid.toString(),
      false,
      null
    ]
  );
}

async function main() {
  await ensureSchema();
  const totalLots = Number(await auction.totalLots().catch(() => 0));
  for (let id = 1; id <= totalLots; id++) {
    await upsertAuctionState(id);
  }

  auction.on("LotCreated", async (id) => {
    const lotId = Number(id);
    logger.info({ lotId }, "lot created event");
    await upsertAuctionState(lotId);
  });

  auction.on("Bid", async (id, bidder, amount, newEnd) => {
    const auctionId = Number(id);
    logger.info({ auctionId, bidder }, "bid placed");
    await db.query(
      `insert into auction_bid (auction_id, wallet, amount)
       values ($1,$2,$3)`,
      [auctionId, bidder.toLowerCase(), amount.toString()]
    );
    await db.query(
      `update auction_state set highest_bidder=$2, highest_bid=$3, end_time=to_timestamp($4), updated_at=now()
       where id=$1`,
      [auctionId, bidder.toLowerCase(), amount.toString(), Number(newEnd)]
    );
  });

  auction.on("Settled", async (id, winner, amount, leaseUntil) => {
    const auctionId = Number(id);
    logger.info({ auctionId, winner }, "auction settled");
    await db.query(
      `update auction_state set settled=true, highest_bidder=$2, highest_bid=$3, lease_end=to_timestamp($4), updated_at=now()
       where id=$1`,
      [auctionId, winner.toLowerCase(), amount.toString(), Number(leaseUntil)]
    );
  });

  logger.info("indexer running");
}

main().catch((err) => {
  logger.error({ err }, "indexer failure");
  process.exit(1);
});
