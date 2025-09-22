import { PrismaClient } from "@prisma/client";
import { loadConfig } from "../config/env";

const { databaseUrl } = loadConfig();

export const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } }
});
