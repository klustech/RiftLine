import { z } from "zod";

export const auctionBidSchema = z.object({
  amount: z.string().regex(/^[0-9]+$/, "amount must be numeric")
});

export const travelRequestSchema = z.object({
  toShard: z.number().int().positive().or(z.string().regex(/^[0-9]+$/))
});
