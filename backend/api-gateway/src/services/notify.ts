import axios from "axios";
import { loadConfig } from "../config/env";
import { logger } from "./logger";

const { nakamaRpcUrl } = loadConfig();

export async function notifyAuctionEvent(wallet: string, message: string) {
  if (!nakamaRpcUrl) {
    logger.debug({ wallet, message }, "nakama RPC URL not set; skipping notification");
    return;
  }
  try {
    await axios.post(`${nakamaRpcUrl}/auction`, { wallet, message });
  } catch (err) {
    logger.warn({ err }, "failed to dispatch notification");
  }
}
