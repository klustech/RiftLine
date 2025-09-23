import { Router } from "express";
import { prisma } from "../services/db";
import { requireAuth } from "../middleware/auth";
import { auctionBidSchema } from "../validators/market";
import { serializeBigInt } from "../utils/serialization";
import { notifyAuctionEvent } from "../services/notify";
import { placeAuctionBid } from "../services/chain";
import { requireCompliantPlayer } from "../middleware/compliance";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const now = new Date();
    const auctions = await prisma.auctionState.findMany({
      where: { endTime: { gt: now }, settled: false },
      orderBy: { endTime: "asc" },
      take: 200
    });
    res.json(serializeBigInt(auctions));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/bid", requireAuth, requireCompliantPlayer, async (req, res, next) => {
  try {
    const { amount } = auctionBidSchema.parse(req.body ?? {});
    const auctionId = Number(req.params.id);
    if (!Number.isFinite(auctionId)) {
      return res.status(400).json({ error: "invalid_auction" });
    }

    const bidAmount = BigInt(amount);
    const hash = await placeAuctionBid(auctionId, bidAmount);
    await prisma.auctionBid.create({
      data: {
        auctionId,
        wallet: req.auth!.wallet,
        amountWei: amount,
        txHash: hash ?? null
      }
    });
    await notifyAuctionEvent(req.auth!.wallet, `Bid submitted for auction #${auctionId}`);
    res.json({ ok: true, txHash: hash });
  } catch (err) {
    next(err);
  }
});

export default router;
