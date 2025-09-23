import { config } from "dotenv";

config();

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for db tooling");
  }
  return url;
}
