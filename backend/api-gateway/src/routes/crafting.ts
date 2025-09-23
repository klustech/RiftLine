import { Router } from "express";
import { ethers } from "ethers";
import { requireAuth } from "../middleware/auth";
import { requireCompliantPlayer } from "../middleware/compliance";
import { craftRequestSchema } from "../validators/crafting";
import { prisma } from "../services/db";
import { contracts } from "../services/chain";
import { recordAuditEvent } from "../services/compliance";

const router = Router();

router.post("/", requireAuth, requireCompliantPlayer, async (req, res, next) => {
  try {
    const parsed = craftRequestSchema.parse(req.body ?? {});
    const registry = contracts.registry;
    const items = contracts.item1155;
    if (!registry || !items) {
      return res.status(503).json({ error: "contracts_unavailable" });
    }

    const wallet = req.auth!.wallet;
    const kindKey = ethers.keccak256(ethers.toUtf8Bytes(`ITEM:${parsed.itemType}`));
    const cap = await registry.serverCaps(parsed.serverId, kindKey);
    if (cap === 0n) {
      return res.status(400).json({ error: "cap_undefined" });
    }
    const minted = await registry.serverMinted(parsed.serverId, kindKey);
    const amount = BigInt(parsed.amount);
    if (minted + amount > cap) {
      return res.status(400).json({ error: "cap_exceeded", cap: cap.toString(), minted: minted.toString() });
    }

    const itemType = BigInt(parsed.itemType);
    const tx = await items.mintServer(wallet, parsed.serverId, itemType, amount, parsed.uri ?? "", "0x");
    const receipt = await tx.wait();

    const tokenId = `${parsed.serverId}:${parsed.itemType}`;
    await prisma.inventory1155.upsert({
      where: { wallet_tokenId: { wallet, tokenId } },
      create: { wallet, tokenId, amount },
      update: { amount: { increment: amount } }
    });

    await recordAuditEvent(wallet, "craft", wallet, {
      serverId: parsed.serverId,
      itemType: parsed.itemType,
      amount: parsed.amount
    });

    res.json({
      ok: true,
      txHash: receipt?.hash,
      minted: amount.toString()
    });
  } catch (err) {
    next(err);
  }
});

export default router;
