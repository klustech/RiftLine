import { Router } from "express";
import { prisma } from "../services/db";
import { serializeBigInt } from "../utils/serialization";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/listings", async (_req, res, next) => {
  try {
    const listings = await prisma.marketListing.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    });
    res.json(serializeBigInt(listings));
  } catch (err) {
    next(err);
  }
});

router.post("/listings/:id/watch", requireAuth, async (req, res, next) => {
  try {
    const listingId = req.params.id;
    await prisma.marketWatch.upsert({
      where: { listingId_wallet: { listingId, wallet: req.auth!.wallet } },
      update: { updatedAt: new Date() },
      create: { listingId, wallet: req.auth!.wallet }
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
