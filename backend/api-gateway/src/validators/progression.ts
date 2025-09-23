import { z } from "zod";

export const progressionSyncSchema = z.object({
  tokenId: z.number().int().nonnegative(),
  xp: z.number().int().min(0),
  rep: z.number().int()
});

export const loadoutUpdateSchema = z.object({
  tokenId: z.number().int().nonnegative(),
  loadout: z.array(z.string().min(1).max(128)).max(16)
});
