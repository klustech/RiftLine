import type { Request } from "express";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../services/db";
import { loadConfig } from "../config/env";

const router = Router();
const { jwtSecret } = loadConfig();

function resolveWallet(req: Request): string | null {
  const headerWallet = req.header("x-wallet") ?? req.header("x-wallet-address");
  if (headerWallet && typeof headerWallet === "string" && headerWallet.trim().length > 0) {
    return headerWallet.trim();
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), jwtSecret) as { wallet?: string; w?: string };
      const tokenWallet = payload.wallet ?? payload.w;
      if (tokenWallet && tokenWallet.length > 0) {
        return tokenWallet;
      }
    } catch (err) {
      // ignore optional auth errors
    }
  }
  return null;
}

router.post("/", async (req, res, next) => {
  try {
    const { kind, shardId, payload } = req.body ?? {};
    if (typeof kind !== "string" || kind.trim().length === 0) {
      return res.status(400).json({ error: "invalid_kind" });
    }

    const event = await prisma.telemetryEvent.create({
      data: {
        wallet: resolveWallet(req) ?? undefined,
        kind: kind.trim(),
        shardId: Number.isInteger(shardId) ? Number(shardId) : undefined,
        payload: payload ?? {}
      }
    });

    res.json({ ok: true, id: event.id });
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const [total, lastHour] = await Promise.all([
      prisma.telemetryEvent.count(),
      prisma.telemetryEvent.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({ total, lastHour });
  } catch (err) {
    next(err);
  }
});

export default router;
