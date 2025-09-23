import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../services/db";
import { loadConfig } from "../config/env";
import { createGuestSchema, heartbeatSchema, updateProfileSchema } from "../validators/players";
import { requireAuth } from "../middleware/auth";
import { serializeBigInt } from "../utils/serialization";

const router = Router();
const { jwtSecret } = loadConfig();

router.post("/guest", async (req, res, next) => {
  try {
    const { username } = createGuestSchema.parse(req.body ?? {});
    const wallet = `guest:${Math.random().toString(36).slice(2, 10)}`;
    const player = await prisma.player.create({
      data: {
        wallet,
        username: username ?? `rft_${wallet.slice(-6)}`,
        kycStatus: "guest"
      }
    });
    const token = jwt.sign({ id: player.id, wallet }, jwtSecret, { expiresIn: "2d" });
    res.json({ token, player: serializeBigInt(player) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.auth!.id },
      include: { shard: true }
    });
    if (!player) return res.status(404).json({ error: "not_found" });
    res.json(serializeBigInt(player));
  } catch (err) {
    next(err);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body ?? {});
    const player = await prisma.player.update({ where: { id: req.auth!.id }, data });
    res.json(serializeBigInt(player));
  } catch (err) {
    next(err);
  }
});

router.post("/heartbeat", requireAuth, async (req, res, next) => {
  try {
    const { shardId } = heartbeatSchema.parse(req.body ?? {});
    await prisma.player.update({
      where: { id: req.auth!.id },
      data: {
        shardId: typeof shardId === "number" ? shardId : undefined
      }
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
