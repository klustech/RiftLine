import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { contracts } from "../services/chain";
import { progressionSyncSchema, loadoutUpdateSchema } from "../validators/progression";

const router = Router();

router.post("/sync", requireAuth, async (req, res, next) => {
  try {
    const parsed = progressionSyncSchema.parse(req.body ?? {});
    const character = contracts.character;
    if (!character) {
      return res.status(503).json({ error: "contracts_unavailable" });
    }
    const tx = await character.syncProgression(parsed.tokenId, parsed.xp, parsed.rep);
    const receipt = await tx.wait();
    res.json({ ok: true, txHash: receipt?.hash });
  } catch (err) {
    next(err);
  }
});

router.post("/loadout", requireAuth, async (req, res, next) => {
  try {
    const parsed = loadoutUpdateSchema.parse(req.body ?? {});
    const character = contracts.character;
    if (!character) {
      return res.status(503).json({ error: "contracts_unavailable" });
    }
    const tx = await character.setLoadout(parsed.tokenId, parsed.loadout);
    const receipt = await tx.wait();
    res.json({ ok: true, txHash: receipt?.hash });
  } catch (err) {
    next(err);
  }
});

export default router;
