import { Router } from "express";
import { prisma } from "../services/db";
import { requireAuth } from "../middleware/auth";

const router = Router();
const MAX_WANTED_STARS = 5;
const DECAY_SECONDS_PER_STAR = 60;

function clampStars(input: unknown): number {
  const numeric = Number(input ?? 1);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.min(MAX_WANTED_STARS, Math.max(1, Math.floor(numeric)));
}

function secondsRemaining(target: Date | null): number {
  if (!target) return 0;
  return Math.max(0, Math.round((target.getTime() - Date.now()) / 1000));
}

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const player = await prisma.player.findUnique({
      where: { wallet: req.auth!.wallet },
      select: { wantedUntil: true }
    });
    if (!player) {
      return res.status(404).json({ error: "player_not_found" });
    }

    res.json({
      wantedUntil: player.wantedUntil ? player.wantedUntil.toISOString() : null,
      secondsRemaining: secondsRemaining(player.wantedUntil)
    });
  } catch (err) {
    next(err);
  }
});

router.post("/add", requireAuth, async (req, res, next) => {
  try {
    const stars = clampStars(req.body?.stars);
    const player = await prisma.player.findUnique({
      where: { wallet: req.auth!.wallet },
      select: { wallet: true, wantedUntil: true }
    });
    if (!player) {
      return res.status(404).json({ error: "player_not_found" });
    }

    const base = player.wantedUntil && player.wantedUntil.getTime() > Date.now() ? player.wantedUntil : new Date();
    const newWantedUntil = new Date(base.getTime() + stars * DECAY_SECONDS_PER_STAR * 1000);

    await prisma.player.update({
      where: { wallet: player.wallet },
      data: { wantedUntil: newWantedUntil }
    });

    await prisma.telemetryEvent.create({
      data: {
        wallet: player.wallet,
        kind: "wanted_add",
        payload: { stars, wantedUntil: newWantedUntil.toISOString() }
      }
    });

    res.json({
      ok: true,
      stars,
      wantedUntil: newWantedUntil.toISOString(),
      secondsRemaining: secondsRemaining(newWantedUntil)
    });
  } catch (err) {
    next(err);
  }
});

router.post("/clear", requireAuth, async (req, res, next) => {
  try {
    const player = await prisma.player.update({
      where: { wallet: req.auth!.wallet },
      data: { wantedUntil: null },
      select: { wallet: true }
    });

    await prisma.telemetryEvent.create({
      data: { wallet: player.wallet, kind: "wanted_clear", payload: {} }
    });

    res.json({ ok: true });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return res.status(404).json({ error: "player_not_found" });
    }
    next(err);
  }
});

export default router;
