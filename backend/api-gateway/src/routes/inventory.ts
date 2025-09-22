import { Router } from "express";
import { prisma } from "../services/db";
import { requireAuth } from "../middleware/auth";
import { serializeBigInt } from "../utils/serialization";

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

export default router;
