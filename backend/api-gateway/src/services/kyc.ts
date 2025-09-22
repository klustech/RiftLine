export type KycGateResult = { ok: boolean; reason?: string };

export async function ensureKyc(wallet: string): Promise<KycGateResult> {
  // hook for future KYC provider integration
  if (wallet.startsWith("guest:")) {
    return { ok: false, reason: "guest_wallet" };
  }
  return { ok: true };
}
