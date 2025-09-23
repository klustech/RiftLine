import { Router } from "express";
import { prisma } from "../services/db";

const router = Router();

router.get("/stats", async (_req, res, next) => {
  try {
    const [players, tickets, telemetry] = await Promise.all([
      prisma.player.count(),
      prisma.travelTicket.count(),
      prisma.telemetryEvent.count()
    ]);

    res.json({ players, tickets, telemetry });
  } catch (err) {
    next(err);
  }
});

export default router;
