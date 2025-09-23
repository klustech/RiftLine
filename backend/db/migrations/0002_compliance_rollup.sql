CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_compliance_rollup AS
SELECT
  p.id AS player_id,
  p.wallet,
  p."kycStatus" AS kyc_status,
  p."riskScore" AS risk_score,
  (
    SELECT status FROM "ComplianceCase"
    WHERE "playerId" = p.id
    ORDER BY "createdAt" DESC
    LIMIT 1
  ) AS latest_case_status,
  (
    SELECT status FROM "AmlCheck"
    WHERE "playerId" = p.id
    ORDER BY "createdAt" DESC
    LIMIT 1
  ) AS latest_aml_status,
  (
    SELECT MAX("createdAt") FROM "ComplianceAuditLog"
    WHERE wallet = p.wallet
  ) AS last_audit_at
FROM "Player" p;

CREATE UNIQUE INDEX IF NOT EXISTS analytics_compliance_rollup_pid_idx
  ON analytics_compliance_rollup(player_id);
