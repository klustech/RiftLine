import { Prisma, AmlStatus, ComplianceStatus, PlayerKycStatus } from "@prisma/client";
import { prisma } from "./db";
import { logger } from "./logger";

export interface GateResult {
  ok: boolean;
  reason?: string;
  caseId?: string;
}

export async function ensurePlayerCompliance(playerId: string): Promise<GateResult> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { riskFlags: true }
  });
  if (!player) {
    return { ok: false, reason: "player_not_found" };
  }

  if (player.restrictedAt) {
    return { ok: false, reason: "restricted" };
  }

  const activeFlag = player.riskFlags.find((flag) => !flag.expiresAt || flag.expiresAt > new Date());
  if (activeFlag) {
    return { ok: false, reason: `risk_${activeFlag.reason}` };
  }

  if (player.kycStatus === "pending" || player.kycStatus === "guest") {
    return { ok: false, reason: "kyc_pending" };
  }

  if (player.riskScore >= 80) {
    return { ok: false, reason: "risk_score" };
  }

  return { ok: true };
}

export async function startKycCase(playerId: string, provider: string, level: string): Promise<{ caseId: string; url: string }>
{
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error("player_not_found");
  }

  const kycCase = await prisma.complianceCase.create({
    data: {
      playerId,
      provider,
      level,
      status: ComplianceStatus.pending
    }
  });

  await prisma.player.update({
    where: { id: playerId },
    data: { kycStatus: PlayerKycStatus.pending }
  });

  logger.info({ playerId, caseId: kycCase.id }, "kyc case created");
  const redirectUrl = `${process.env.KYC_CALLBACK_BASE ?? "https://kyc.mock"}/case/${kycCase.id}`;
  return { caseId: kycCase.id, url: redirectUrl };
}

export async function updateKycCase(caseId: string, status: ComplianceStatus, reference?: string) {
  const kycCase = await prisma.complianceCase.update({
    where: { id: caseId },
    data: {
      status,
      reference,
      resolvedAt: status === ComplianceStatus.approved || status === ComplianceStatus.rejected ? new Date() : undefined
    }
  });

  if (status === ComplianceStatus.approved) {
    await prisma.player.update({
      where: { id: kycCase.playerId },
      data: { kycStatus: PlayerKycStatus.verified }
    });
  } else if (status === ComplianceStatus.rejected) {
    await prisma.player.update({
      where: { id: kycCase.playerId },
      data: { kycStatus: PlayerKycStatus.pending, riskScore: { increment: 20 } }
    });
  }
}

export async function recordAmlCheck(playerId: string, provider: string, score: number) {
  let status: AmlStatus;
  if (score >= 90) {
    status = "blocked";
  } else if (score >= 70) {
    status = "review";
  } else if (score >= 50) {
    status = "review";
  } else {
    status = "clear";
  }
  const aml = await prisma.amlCheck.create({
    data: {
      playerId,
      provider,
      score,
      status
    }
  });

  await prisma.player.update({
    where: { id: playerId },
    data: {
      riskScore: Math.min(100, aml.score),
      restrictedAt: status === "blocked" ? new Date() : null
    }
  });

  logger.info({ playerId, score, status }, "aml check recorded");
  return aml;
}

export async function recordAuditEvent(wallet: string, kind: string, actor: string, meta: Prisma.JsonValue) {
  await prisma.complianceAuditLog.create({
    data: {
      wallet,
      kind,
      actor,
      meta: meta as Prisma.InputJsonValue
    }
  });
}

export async function recordDeviceAttestation(params: {
  playerId: string;
  deviceId: string;
  attestationId: string;
  platform: string;
  result: string;
}) {
  const { playerId, deviceId, attestationId, platform, result } = params;
  await prisma.deviceAttestation.upsert({
    where: {
      deviceId_attestationId: {
        deviceId,
        attestationId
      }
    },
    update: {
      result,
      platform
    },
    create: {
      playerId,
      deviceId,
      attestationId,
      platform,
      result
    }
  });
}

export async function getComplianceProfile(wallet: string) {
  const player = await prisma.player.findUnique({
    where: { wallet },
    include: {
      complianceCases: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      amlChecks: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!player) {
    return {
      kycStatus: PlayerKycStatus.none,
      amlStatus: "clear",
      riskScore: 0
    };
  }

  const latestCase = player.complianceCases[0];
  const latestAml = player.amlChecks[0];

  return {
    kycStatus: player.kycStatus,
    amlStatus: latestAml?.status ?? "clear",
    riskScore: player.riskScore,
    caseId: latestCase?.id
  };
}
