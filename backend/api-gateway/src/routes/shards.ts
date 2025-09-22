import { Router } from "express";
import { prisma } from "../services/db";
import { serializeBigInt } from "../utils/serialization";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const shards = await prisma.shard.findMany({ orderBy: { id: "asc" } });
    res.json(serializeBigInt(shards));
  } catch (err) {
    next(err);
  }
});

export default router;
