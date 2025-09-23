import { Router } from "express";
import { prisma } from "../services/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", async (_req, res) => {
  const factions = await prisma.faction.findMany({
    include: { _count: { select: { members: true } } }
  });
  res.json(factions);
});

router.post("/create", requireAuth, async (req: any, res) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "invalid_name" });
    return;
  }

  const faction = await prisma.faction.create({ data: { name } });
  res.json(faction);
});

router.post("/:id/join", requireAuth, async (req: any, res) => {
  const id = String(req.params.id);
  const member = await prisma.factionMember.upsert({
    where: {
      factionId_wallet: {
        factionId: id,
        wallet: req.auth!.wallet
      }
    },
    create: {
      factionId: id,
      wallet: req.auth!.wallet,
      rep: 0
    },
    update: {}
  });

  res.json(member);
});

router.post("/:id/leave", requireAuth, async (req: any, res) => {
  const id = String(req.params.id);
  await prisma.factionMember
    .delete({
      where: {
        factionId_wallet: {
          factionId: id,
          wallet: req.auth!.wallet
        }
      }
    })
    .catch(() => undefined);

  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req: any, res) => {
  const memberships = await prisma.factionMember.findMany({
    where: { wallet: req.auth!.wallet },
    include: { faction: true }
  });
  res.json(memberships);
});

export default router;
