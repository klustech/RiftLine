import { Router } from "express";
import type { Request } from "express";
import { requireAuth } from "../middleware/auth";
import {
  amlScanSchema,
  complianceProfileSchema,
  deviceAttestationSchema,
  kycCallbackSchema,
  kycStartSchema
} from "../validators/inventory";
import {
  ensurePlayerCompliance,
  getComplianceProfile,
  recordAmlCheck,
  recordAuditEvent,
  recordDeviceAttestation,
  startKycCase,
  updateKycCase
} from "../services/compliance";
import { serializeBigInt } from "../utils/serialization";

const router = Router();

function isInternalRequest(req: Request) {
  const header = req.headers["authorization"] ?? req.headers["x-internal-token"];
  if (!header) return false;
  const token = Array.isArray(header) ? header[0] : header;
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) return true;
  if (token.startsWith("Bearer ")) {
    return token.slice(7) === expected;
  }
  return token === expected;
}

router.post("/kyc/start", requireAuth, async (req, res, next) => {
  try {
    const { provider, level } = kycStartSchema.parse(req.body ?? {});
    const { caseId, url } = await startKycCase(req.auth!.id, provider, level);
    await recordAuditEvent(req.auth!.wallet, "kyc_start", req.auth!.wallet, { provider, level, caseId });
    res.json({ caseId, url });
  } catch (err) {
    next(err);
  }
});

router.get("/kyc/status", requireAuth, async (req, res, next) => {
  try {
    const profile = await getComplianceProfile(req.auth!.wallet);
    res.json({ status: profile.kycStatus, caseId: profile.caseId });
  } catch (err) {
    next(err);
  }
});

router.post("/kyc/callback", async (req, res, next) => {
  try {
    if (!isInternalRequest(req)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const { caseId, status, reference } = kycCallbackSchema.parse(req.body ?? {});
    await updateKycCase(caseId, status as any, reference);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/aml/scan", requireAuth, async (req, res, next) => {
  try {
    const { provider, score } = amlScanSchema.parse(req.body ?? {});
    const resolvedScore = typeof score === "number" ? score : Math.floor(Math.random() * 100);
    const aml = await recordAmlCheck(req.auth!.id, provider, resolvedScore);
    await recordAuditEvent(req.auth!.wallet, "aml_scan", req.auth!.wallet, { provider, score: resolvedScore });
    res.json({ ok: true, aml: serializeBigInt(aml) });
  } catch (err) {
    next(err);
  }
});

router.post("/device/attest", requireAuth, async (req, res, next) => {
  try {
    const payload = deviceAttestationSchema.parse(req.body ?? {});
    await recordDeviceAttestation({
      playerId: req.auth!.id,
      ...payload
    });
    await recordAuditEvent(req.auth!.wallet, "device_attest", req.auth!.wallet, payload);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/profile", async (req, res, next) => {
  try {
    if (!isInternalRequest(req)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const { wallet } = complianceProfileSchema.parse(req.body ?? {});
    const profile = await getComplianceProfile(wallet);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.get("/gate", requireAuth, async (req, res, next) => {
  try {
    const gate = await ensurePlayerCompliance(req.auth!.id);
    res.json(gate);
  } catch (err) {
    next(err);
  }
});

export default router;
