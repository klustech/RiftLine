import { z } from "zod";

export const createGuestSchema = z.object({
  username: z.string().trim().min(3).max(32).optional()
});

export const updateProfileSchema = z.object({
  username: z.string().trim().min(3).max(32).optional(),
  pushToken: z.string().trim().max(256).optional()
});

export const heartbeatSchema = z.object({
  shardId: z.number().int().optional()
});
