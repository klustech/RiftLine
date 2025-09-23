import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const issueSchema = z.object({
  wallet: z.string().min(1),
  scope: z.string().min(1),
  ttlMinutes: z.number().int().positive().optional()
});

router.post("/issue", requireAuth, async (req, res, next) => {
  try {
    const input = issueSchema.parse(req.body ?? {});
    const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 60) * 60 * 1000);
    const key = await prisma.sessionKey.create({
      data: {
        wallet: input.wallet,
        scope: input.scope,
        expiresAt
      }
    });
    res.json({
      id: key.id,
      wallet: key.wallet,
      scope: key.scope,
      expiresAt: key.expiresAt,
      revoked: key.revoked
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/revoke", requireAuth, async (req, res, next) => {
  try {
    await prisma.sessionKey.update({
      where: { id: req.params.id },
      data: { revoked: true }
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const keys = await prisma.sessionKey.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    });
    res.json(keys);
  } catch (err) {
    next(err);
  }
});

export default router;
