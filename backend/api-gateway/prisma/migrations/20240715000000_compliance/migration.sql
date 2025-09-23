-- Add new enum types
CREATE TYPE "ComplianceStatus" AS ENUM ('pending', 'collecting', 'approved', 'rejected', 'manual_review');
CREATE TYPE "AmlStatus" AS ENUM ('clear', 'review', 'blocked');

-- Extend player table
ALTER TABLE "Player"
  ADD COLUMN "riskScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "restrictedAt" TIMESTAMP(3);

-- Compliance case table
CREATE TABLE "ComplianceCase" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "status" "ComplianceStatus" NOT NULL DEFAULT 'pending',
  "level" TEXT NOT NULL DEFAULT 'standard',
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ComplianceCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComplianceCase_playerId_idx" ON "ComplianceCase"("playerId");

-- Compliance artifacts
CREATE TABLE "ComplianceArtifact" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "uri" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceArtifact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComplianceArtifact_caseId_idx" ON "ComplianceArtifact"("caseId");

-- Compliance audit log
CREATE TABLE "ComplianceAuditLog" (
  "id" TEXT NOT NULL,
  "wallet" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "meta" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComplianceAuditLog_wallet_idx" ON "ComplianceAuditLog"("wallet");

-- AML checks
CREATE TABLE "AmlCheck" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "status" "AmlStatus" NOT NULL DEFAULT 'clear',
  "score" INTEGER NOT NULL DEFAULT 0,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AmlCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AmlCheck_playerId_idx" ON "AmlCheck"("playerId");

-- Device attestation table
CREATE TABLE "DeviceAttestation" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "attestationId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceAttestation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceAttestation_device_attestation_unique" ON "DeviceAttestation"("deviceId", "attestationId");
CREATE INDEX "DeviceAttestation_playerId_idx" ON "DeviceAttestation"("playerId");

-- Risk flags
CREATE TABLE "RiskFlag" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "severity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "RiskFlag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RiskFlag_playerId_idx" ON "RiskFlag"("playerId");

-- Foreign key wiring
ALTER TABLE "ComplianceCase"
  ADD CONSTRAINT "ComplianceCase_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceArtifact"
  ADD CONSTRAINT "ComplianceArtifact_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ComplianceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AmlCheck"
  ADD CONSTRAINT "AmlCheck_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeviceAttestation"
  ADD CONSTRAINT "DeviceAttestation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RiskFlag"
  ADD CONSTRAINT "RiskFlag_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
