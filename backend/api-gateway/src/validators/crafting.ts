import { z } from "zod";

export const craftRequestSchema = z.object({
  serverId: z.number().int().nonnegative(),
  itemType: z.number().int().nonnegative(),
  amount: z.number().int().min(1).max(100),
  uri: z.string().max(256).optional()
});
