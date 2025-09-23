import { Router } from "express";
import { prisma } from "../services/db";
import { requireAuth } from "../middleware/auth";
import { requireCompliantPlayer } from "../middleware/compliance";
import { serializeBigInt } from "../utils/serialization";
import { craftRequestSchema } from "../validators/inventory";
import { recordAuditEvent } from "../services/compliance";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const wallet = req.auth!.wallet;
    const [items1155, apartments] = await Promise.all([
      prisma.inventory1155.findMany({ where: { wallet }, orderBy: { updatedAt: "desc" } }),
      prisma.apartment721.findMany({ where: { wallet } })
    ]);
    res.json({
      items1155: serializeBigInt(items1155),
      apartments: serializeBigInt(apartments)
    });
  } catch (err) {
    next(err);
  }
});

router.post("/craft", requireAuth, requireCompliantPlayer, async (req, res, next) => {
  try {
    const parsed = craftRequestSchema.parse(req.body ?? {});
    const tokenId = String(parsed.itemId);
    const amount = BigInt(parsed.amount ?? 1);

    const inventory = await prisma.inventory1155.upsert({
      where: { wallet_tokenId: { wallet: req.auth!.wallet, tokenId } },
      update: { amount: { increment: amount } },
      create: {
        wallet: req.auth!.wallet,
        tokenId,
        amount
      }
    });

    await recordAuditEvent(req.auth!.wallet, "craft", req.auth!.wallet, {
      tokenId,
      amount: parsed.amount ?? 1,
      shardId: parsed.shardId
    });

    res.json({ ok: true, item: serializeBigInt(inventory) });
  } catch (err) {
    next(err);
  }
});

export default router;
