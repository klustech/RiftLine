import { Router } from "express";
import { prisma } from "../services/db";
import { requireAuth } from "../middleware/auth";

type NamedState = {
  label: "Pending" | "Streaming" | "Committed" | "Finalized" | "Failed";
  showOverlay: boolean;
};

const router = Router();

const stateMap: Record<string, NamedState> = {
  pending: { label: "Pending", showOverlay: true },
  committed: { label: "Committed", showOverlay: true },
  finalized: { label: "Finalized", showOverlay: false },
  failed: { label: "Failed", showOverlay: true }
};

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const ticket = await prisma.travelTicket.findFirst({
      where: { wallet: req.auth!.wallet },
      orderBy: { createdAt: "desc" }
    });

    if (!ticket) {
      return res.json({ state: "Finalized", showOverlay: false });
    }

    const mapped = stateMap[ticket.status] ?? { label: "Streaming", showOverlay: true };
    res.json({
      state: mapped.label,
      showOverlay: mapped.showOverlay,
      ticket: {
        id: ticket.id,
        fromShard: ticket.fromShard,
        toShard: ticket.toShard,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
