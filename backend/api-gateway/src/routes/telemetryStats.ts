import { Router } from "express";
import { prisma } from "../services/db";

const router = Router();

router.get("/kinds", async (_req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ kind: string; n: bigint }>>(`
      select kind, count(*) as n
      from "TelemetryEvent"
      group by kind
      order by n desc
      limit 50
    `);
    res.json(rows.map((row) => ({ kind: row.kind, count: Number(row.n) })));
  } catch (err) {
    res.status(500).json({ error: "stats_unavailable" });
  }
});

router.get("/shards", async (_req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ shard: number; n: bigint }>>(`
      select coalesce("shardId", 0) as shard, count(*) as n
      from "TelemetryEvent"
      group by shard
      order by shard asc
    `);
    res.json(rows.map((row) => ({ shardId: Number(row.shard), count: Number(row.n) })));
  } catch (err) {
    res.status(500).json({ error: "stats_unavailable" });
  }
});

export default router;
