# Upgrade Notes

- Replace the legacy `deploy/weapons.ts` flow with the staged scripts: `scripts/00_deploy_core.ts`, `01_seed_servers.ts`, `02_seed_assets.ts`, and `03_seed_auctions.ts`.
- Before upgrading proxies, execute the Foundry test suite in `contracts/foundry` to validate auctions, treasury, and gateway invariants.
- For UUPS or transparent proxy upgrades, confirm storage layout compatibility with `forge inspect` or the OpenZeppelin Upgrades plugin prior to deployment.
