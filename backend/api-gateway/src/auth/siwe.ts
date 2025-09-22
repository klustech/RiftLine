import { generateNonce, SiweMessage } from "siwe";
import jwt from "jsonwebtoken";
import { prisma } from "../services/db";
import { loadConfig } from "../config/env";

const nonces = new Map<string, number>();
const NONCE_TTL = 5 * 60 * 1000;
const { jwtSecret } = loadConfig();

export function createNonce() {
  const nonce = generateNonce();
  nonces.set(nonce, Date.now() + NONCE_TTL);
  return nonce;
}

function consumeNonce(nonce: string) {
  const exp = nonces.get(nonce);
  if (!exp) throw new Error("nonce_invalid");
  if (Date.now() > exp) {
    nonces.delete(nonce);
    throw new Error("nonce_expired");
  }
  nonces.delete(nonce);
}

export async function verifySiwe(message: string, signature: string) {
  const siwe = new SiweMessage(message);
  const { data } = await siwe.verify({ signature });
  consumeNonce(data.nonce);
  const wallet = data.address.toLowerCase();

  let player = await prisma.player.findUnique({ where: { wallet } });
  if (!player) {
    player = await prisma.player.create({
      data: { wallet, username: `rft_${wallet.slice(2, 8)}` }
    });
  }

  const token = jwt.sign({ id: player.id, wallet }, jwtSecret, { expiresIn: "7d" });
  return { token, player };
}
