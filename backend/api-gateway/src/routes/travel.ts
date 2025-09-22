import { Router } from "express";
import { prisma } from "../services/db";
import { requireAuth } from "../middleware/auth";
import { travelRequestSchema } from "../validators/market";
import { serializeBigInt } from "../utils/serialization";

const router = Router();

router.post("/request", requireAuth, async (req, res, next) => {
  try {
    const parsed = travelRequestSchema.parse(req.body ?? {});
    const toShard = typeof parsed.toShard === "string" ? Number(parsed.toShard) : parsed.toShard;
    if (!Number.isFinite(toShard)) {
      return res.status(400).json({ error: "invalid_shard" });
    }

    const existing = await prisma.travelTicket.findFirst({
      where: { wallet: req.auth!.wallet, status: "pending" }
    });
    if (existing) {
      return res.status(409).json({ error: "transfer_pending", ticketId: existing.id });
    }

    const player = await prisma.player.findUnique({ where: { id: req.auth!.id } });
    if (!player) return res.status(404).json({ error: "player_not_found" });

    const ticket = await prisma.travelTicket.create({
      data: {
        wallet: req.auth!.wallet,
        fromShard: player.shardId ?? 0,
        toShard,
        status: "pending"
      }
    });

    await prisma.player.update({ where: { id: req.auth!.id }, data: { shardId: toShard } });
    res.json({ ticket: serializeBigInt(ticket) });
  } catch (err) {
    next(err);
  }
});

export default router;
