# RiftLine

> A unified, cross-platform game ecosystem developed by **KlusterTech, Inc.** that fuses a mobile-first Unreal Engine experience, a connected companion app, authoritative real-time services, and an on-chain economy.
>
> **Proprietary Notice** – This repository is confidential KlusterTech property. Access is restricted to approved contributors under active NDA agreements. See [KlusterTech Proprietary Notice](docs/legal/PROPRIETARY_NOTICE.md) and [Contributor Access & Compliance Policy](docs/compliance/CONTRIBUTOR_ACCESS_POLICY.md).

## At a Glance

- **Mobile-optimised Unreal Engine 5 gameplay** featuring touch-first input mappings, contextual interaction components, a radial action menu, and a diegetic smartphone HUD that mirrors backend wanted/compliance state.
- **Comprehensive TypeScript API gateway** exposing authentication, player inventory, economy, shard travel, telemetry, compliance, crafting, and on-chain progression endpoints backed by Prisma schemas.
- **Nakama authoritative modules** that bootstrap cross-shard sessions, persist wanted levels, enforce compliance gates, and drive shard match loops with broadcastable heat escalation.
- **Domain microservices** covering blockchain event indexing, cross-shard transfer finalisation, and push notification fan-out.
- **Web3 infrastructure and contracts** including upgradeable Hardhat deployments, Foundry fuzz-tested v2 prototypes, Redis-backed bundler/paymaster services, and deployment scripts that seed the in-game economy.
- **React Native companion application** delivering guest onboarding, inventory views, marketplace/auction flows, shard selection, and Nakama chat.
- **Operations surfaces & data tooling** with an admin metrics dashboard, reusable migration scripts, analytics rollups, and Docker/Kubernetes/Terraform scaffolding for reproducible environments.

## Table of Contents

1. [Platform Overview](#platform-overview)
   - [Unreal Engine Mobile Client](#unreal-engine-mobile-client)
   - [Backend API Gateway](#backend-api-gateway)
   - [Real-time Orchestration (Nakama)](#real-time-orchestration-nakama)
   - [Domain Services & Workers](#domain-services--workers)
   - [Data Platform](#data-platform)
   - [Web3 Layer](#web3-layer)
   - [Mobile Companion Application](#mobile-companion-application)
   - [Operations & Dashboards](#operations--dashboards)
2. [Repository Layout](#repository-layout)
3. [Local Development](#local-development)
   - [Prerequisites](#prerequisites)
   - [Initial Setup](#initial-setup)
   - [Running Core Services](#running-core-services)
   - [Client Applications](#client-applications)
   - [Smart Contract Tooling](#smart-contract-tooling)
4. [Testing & Quality Gates](#testing--quality-gates)
5. [Documentation & Knowledge Base](#documentation--knowledge-base)
6. [Security, Compliance & Operational Notes](#security-compliance--operational-notes)
7. [Support & Communication](#support--communication)

## Platform Overview

### Unreal Engine Mobile Client

The primary UE5 project (`apps/engine-ue5/`) is configured for mobile hardware targets and ships production-ready gameplay systems:

- **Input & UI configuration** – `DefaultEngine.ini` and `DefaultInput.ini` enable virtual joysticks, radial menus, and aspect-aware DPI scaling via a custom `URiftlineUIScalingRule`. Gamepad, touch, and virtual controls are bound to movement, camera, interaction, and the in-game phone toggle.
- **Session-aware game instance** – `URiftlineGameInstance` resolves API/Nakama hosts from environment variables, maintains the session profile, pushes telemetry/wanted events, and runs periodic heartbeats to the backend.
- **Contextual interaction framework** – `URiftlineInteractionComponent` traces for `IRiftlineInteractable` actors, aggregates menu options, and broadcasts them to the radial menu widget or auto-invokes single-option interactions.
- **Diegetic smartphone UI** – `URiftlinePhoneWidget` exposes Blueprint events to render missions, shard state, wallet balances, and compliance status while caching the latest session payload from the game instance.
- **HUD & player experience** – `ARiftlineHUD` listens to game-instance delegates for wanted/compliance updates, and `ARiftlinePlayerController` orchestrates phone visibility, map telemetry, and input modes for touch-friendly UX.
- **Gameplay pawn** – `ARiftlinePawn` bundles camera, spring arm, floating movement, and interaction component wiring, providing the base locomotion experience for both mobile and desktop builds.

### Backend API Gateway

The Express-based gateway (`backend/api-gateway/`) centralises all client-facing APIs with consistent logging, session handling, and contract integration:

- **Authentication** via guest token issuance and SIWE signature verification, with JWT-backed sessions stored in cookies or headers.
- **Player profile & heartbeat** endpoints that hydrate shard assignments, mutate display names, and persist server heartbeats.
- **Inventory & economy surfaces** exposing ERC‑1155 balances, property leases, market listings, auction bidding, crafting, and session-key management.
- **Shard travel workflows** with compliance-aware gating, ticket persistence, and shard reassignment hooks for the cross-shard worker.
- **Compliance automation** covering KYC lifecycles, AML scans, device attestations, audit logging, and middleware that blocks sensitive actions when risk thresholds are exceeded.
- **Telemetry ingestion** that stores arbitrary gameplay events, exposes aggregate stats for dashboards, and automatically attributes wallet context via headers or JWTs.
- **Progression RPC proxies** which invoke on-chain `CharacterSBT` functions for XP sync and loadout updates while honouring contract availability.
- **Runtime safety** through in-memory rate limiting, typed validation with Zod, pino-based structured logging, and Prisma-backed persistence defined in `prisma/schema.prisma`.

### Real-time Orchestration (Nakama)

Authoritative gameplay logic lives in TypeScript modules under `backend/nakama/modules/ts/`:

- **Session bootstrap RPC** (`riftline_sessionStart`) stores device/shard metadata, synchronises compliance profiles with the API, and seeds wanted/compliance state in Nakama storage.
- **Wanted system RPCs** apply, clear, and query heat levels while updating live session variables for HUD display and pushing audit events back to the API.
- **Shard match handler** enforces wanted-based join filters, tracks player heat accumulation, and broadcasts escalation or idle status messages at the configured tick rate.
- **Crafting RPC** validates shard/item inputs then relays minting requests to the API for contract execution, preserving recipe metadata.
- **Cross-shard transfer RPC** records transfer intents that the worker consumes when finalising travel tickets.
- **Shared services** (config, state, runtime helpers) abstract Nakama storage and session variable updates to keep module code declarative.

### Domain Services & Workers

Supporting services in `backend/services/` handle infrastructure concerns:

- **Indexer** listens to `RentAuction` events, mirrors auction state/bids into Postgres, and hydrates auction listings for the API and companion app.
- **Cross-shard worker** (`webhooks`) polls pending travel tickets, optionally calls Nakama RPCs to hand off players, and transitions tickets to `finalized`/`failed` status with audit logging.
- **Notifications service** integrates with Firebase Admin to fan out push reminders to watchers when auctions approach expiry.

### Data Platform

Data management tools sit under `backend/db/` and the API’s Prisma workspace:

- **Prisma schema** models players, shards, auctions, compliance artefacts, AML checks, telemetry, and session keys with indexes tuned for gameplay queries.
- **SQL migrations** create analytics tables and materialised compliance rollups for dashboards, executed via `scripts/migrate.sh` or `npm run migrate` in `backend/db/`.
- **Utility scripts** (TypeScript) apply migrations and seeds, enforcing repeatable operations across environments.

### Web3 Layer

The blockchain stack spans contracts, deployment scripts, and supportive services:

- **Upgradeable core contracts** (Hardhat) implement ERC-4907 leasing (`BusinessLicenseNFT`), property vaulting, `RentAuction`, `Item1155`, `AssetMarketplace`, `Treasury`, and supporting tokens with deployment scripts that wire cross-contract roles and seed weapon/vehicle/apartment templates.
- **Foundry v2 prototypes** provide focused contracts (`RentAuctionV2`, `TreasuryV2`, `CrossServerGatewayV2`) with fuzz and unit tests that exercise cancellations, nonce security, and treasury accounting.
- **Bundler service** exposes authenticated ERC-4337 `/rpc` submission, Redis-backed deduplication/queueing, Prometheus metrics, and a worker that retries upstream submissions with exponential backoff.
- **Paymaster service** enforces scoped API key auth, wallet allowance tracking, sponsorship limits, revocation endpoints, and observability metrics.
- **Deployment scripts** (`chain/scripts/*.ts`) automate proxy upgrades, shard cap seeding, template definitions, and auction creation against saved deployment manifests.

### Mobile Companion Application

The Expo/React Native project (`apps/companion-app/`) mirrors the core gameplay state on mobile devices:

- **Guest onboarding** obtains API guest tokens, stores session context in a lightweight reactive store, and navigates users into the authenticated stack.
- **Inventory & market views** fetch ERC‑1155 balances and marketplace listings, enabling watchlists, bid placement, and compliance-aware travel requests.
- **Shard selector & travel** consumes `/shards` data and triggers travel tickets via the API, surfacing pending ticket feedback to the user.
- **Auctions experience** lists live lease auctions with bid confirmation flows tied to the API gateway.
- **Faction chat** connects anonymously to Nakama, auto-joins global channels, and streams chat messages in real time.
- **Configurable API endpoints** via Expo config/environment variables to support staging and production deployments.

### Operations & Dashboards

- **Admin dashboard** (`apps/admin-dashboard/`) is a lightweight React + Vite SPA that polls telemetry, bundler, and paymaster metrics endpoints for live operational insight.
- **Docker Compose stack** (`infra/docker/docker-compose.local.yml`) spins up Postgres, Redis, Nakama, the API gateway, indexer, notification worker, cross-shard worker, bundler, and paymaster for integrated local testing.
- **Infrastructure scaffolding** under `infra/k8s/` and `infra/terraform/` seeds Kubernetes manifests and Terraform module structures for eventual production automation.

## Repository Layout

| Path | Summary |
| ---- | ------- |
| `apps/engine-ue5/` | Unreal Engine 5 mobile project with gameplay C++ sources, config, and plugin placeholders. |
| `apps/companion-app/` | Expo/React Native companion with navigation, Nakama chat, marketplace, auctions, and shard travel screens. |
| `apps/admin-dashboard/` | Operational dashboard surfacing telemetry and service metrics for live monitoring. |
| `backend/api-gateway/` | Express + Prisma API exposing auth, gameplay, compliance, telemetry, crafting, and progression endpoints. |
| `backend/nakama/` | TypeScript Nakama runtime modules for session bootstrap, wanted/compliance state, crafting RPCs, and shard matches. |
| `backend/services/` | Event indexer, notifications dispatcher, and cross-shard worker microservices. |
| `backend/db/` | Database migration & seed utilities for non-Prisma workloads and analytics rollups. |
| `backend/web3/` | Bundler, paymaster, and (placeholder) Thirdweb engine services with Redis-backed state and metrics. |
| `contracts/hardhat/` | Upgradeable Solidity contracts, Hardhat config, and deployment scripts for the on-chain economy. |
| `contracts/foundry/` | Foundry prototypes and fuzz tests for v2 contract flows and security hardening. |
| `chain/` | Hardhat scripting workspace for deploying/seeding complete game-state topologies. |
| `infra/docker/` | Dockerfiles and Compose definitions for local orchestration of backend and web3 services. |
| `infra/k8s/`, `infra/terraform/`, `infra/ci/` | Kubernetes base manifests, Terraform skeletons, and CI/CD placeholders. |
| `scripts/` | Operational helpers for starting/stopping the stack and running migrations or workstation setup. |
| `docs/` | Product, technical, compliance, legal, and operational documentation.

## Local Development

### Prerequisites

- [Node.js 18+](https://nodejs.org/) and npm (pnpm optional for workspace management).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Compose v2.
- [PostgreSQL client tools](https://www.postgresql.org/) for direct database inspection.
- [Redis CLI](https://redis.io/docs/interact/programmability/redis-cli/) (optional) for queue debugging.
- [Unreal Engine 5.x](https://www.unrealengine.com/) with mobile SDKs for client builds.
- Native mobile toolchains: [Xcode](https://developer.apple.com/xcode/) and/or [Android Studio](https://developer.android.com/studio).
- [Foundry](https://book.getfoundry.sh/) and/or [Hardhat](https://hardhat.org/) for smart contract development.

### Initial Setup

1. **Clone the repository** and ensure submodules (if any) are initialised.
2. **Install dependencies** in the workspaces you plan to touch, e.g.:
   ```bash
   npm install --prefix backend/api-gateway
   npm install --prefix backend/services/indexer
   npm install --prefix backend/services/webhooks
   npm install --prefix backend/services/notifications
   npm install --prefix backend/web3/bundler
   npm install --prefix backend/web3/paymaster
   npm install --prefix backend/db
   npm install --prefix backend/nakama/modules/ts
   npm install --prefix apps/companion-app
   npm install --prefix apps/admin-dashboard
   npm install --prefix contracts/hardhat
   ```
3. **Configure environment variables**. Copy `.env.example` files where provided or define the required secrets (JWT, session secret, RPC URLs, operator keys, Firebase credentials, etc.) for each service.
4. **Run database migrations**:
   ```bash
   ./scripts/migrate.sh
   # or use the standalone tooling
   npm run migrate --prefix backend/db
   ```

### Running Core Services

- **Local stack orchestration**
  ```bash
  ./scripts/dev/start.sh    # docker compose up
  ./scripts/dev/stop.sh     # docker compose down
  ```
  The Compose stack exposes Postgres (5432), Redis (6379), Nakama (7350/7351), API gateway (8080), bundler (4337), and paymaster (3001) by default.

- **API gateway**
  ```bash
  npm run dev --prefix backend/api-gateway
  # production build
  npm run build --prefix backend/api-gateway
  npm run start --prefix backend/api-gateway
  ```

- **Nakama modules**
  ```bash
  npm run build --prefix backend/nakama/modules/ts
  # Mount ./build into Nakama via docker-compose.local.yml or copy to your Nakama installation.
  ```

- **Domain services** (run as needed for local testing)
  ```bash
  npm run dev --prefix backend/services/indexer
  npm run dev --prefix backend/services/webhooks
  npm run dev --prefix backend/services/notifications
  ```

- **Bundler & paymaster**
  ```bash
  npm run dev --prefix backend/web3/bundler
  npm run dev --prefix backend/web3/paymaster
  ```
  Both services require Redis and expose `/health` and `/metrics` endpoints for readiness probes.

### Client Applications

- **Unreal Engine**
  1. Open `apps/engine-ue5/Riftline.uproject` in UE5.
  2. Ensure the project detects the `Riftline` module; regenerate project files if needed.
  3. Set environment overrides (`RIFTLINE_API_URL`, `RIFTLINE_NAKAMA_URL`) when running PIE or packaging.

- **Companion app (Expo)**
  ```bash
  npm run start   --prefix apps/companion-app
  npm run android --prefix apps/companion-app
  npm run ios     --prefix apps/companion-app
  ```
  Configure `EXPO_PUBLIC_API` and `EXPO_PUBLIC_NAKAMA_*` variables to point at your local stack.

- **Admin dashboard**
  ```bash
  npm run dev --prefix apps/admin-dashboard
  ```
  By default the dashboard expects bundler metrics on `http://localhost:4337/metrics`, paymaster metrics on `http://localhost:3001/metrics`, and telemetry stats on `http://localhost:8080/telemetry/stats`.

### Smart Contract Tooling

- **Hardhat workspace**
  ```bash
  npm run compile --prefix contracts/hardhat
  npm run test    --prefix contracts/hardhat
  npx hardhat run --network localhost chain/scripts/00_deploy_core.ts
  ```

- **Foundry workspace**
  ```bash
  forge install               # if new environment
  forge fmt
  forge test -C contracts/foundry
  ```

- **Deployment orchestration**
  Use the scripts in `chain/scripts/` (00–03) to deploy the core contracts, seed shard caps, define templates, and mint starter inventory. Each script writes to `chain/deployments/<network>.json` for downstream services (API/indexer/bundler) to consume.

## Testing & Quality Gates

- **API gateway unit tests**: `npm test --prefix backend/api-gateway` (Vitest + Supertest).
- **Type checking**: `npm run build` (gateway/services) and `npm run check --prefix apps/companion-app` for React Native typings.
- **Foundry fuzz/unit tests**: `forge test -C contracts/foundry` for v2 contract behaviours.
- **Hardhat E2E tests**: add tests under `contracts/hardhat/test/` and run `npm run test --prefix contracts/hardhat`.
- **Manual service verification**: hit `/health` and `/metrics` endpoints on API, bundler, and paymaster; inspect Docker logs via `docker compose logs -f <service>`.

## Documentation & Knowledge Base

The `docs/` directory aggregates deep dives by discipline:

- `docs/architecture/` – system diagrams, gameplay-to-backend flows, and service contracts.
- `docs/api/` – REST/RPC references, authentication schemes, and payload conventions.
- `docs/mobile/` & `docs/engine/` – client-specific guidelines, asset workflows, UX specs.
- `docs/contracts/` & `docs/tokenomics/` – smart contract interfaces, economic models.
- `docs/compliance/` & `docs/legal/` – governance policies, contributor onboarding, and legal notices.
- `docs/ops/` – operational runbooks, incident response, and observability standards.

Always cross-reference feature branches with the relevant documentation section and update as part of your change set.

## Security, Compliance & Operational Notes

- **Compliance guardrails** are enforced at the API level through `requireCompliantPlayer`, AML/KYC workflows, audit logs, and device attestation persistence.
- **Session security** leverages JWTs with explicit wallet/id claims, SIWE signature verification, and in-memory nonce tracking.
- **Rate limiting** protects all Express routes from burst abuse; use an external limiter (Redis/NGINX) for production workloads.
- **Secrets management** should migrate from `.env` files to Vault/ASM integrations before production deployments; placeholders exist under `infra/k8s/base/secret-example.yaml`.
- **Observability** is provided by pino logs and Prometheus metrics on bundler/paymaster; extend to the API via OpenTelemetry or pino transports as needed.
- **Infrastructure automation** is intentionally scaffolded—fill in Terraform modules, Kubernetes overlays, and CI pipelines before attempting production rollout.

## Support & Communication

- Engineering discussions: `#riftline-engineering` (Slack) or the internal Discourse space.
- Incident response: follow runbooks in `docs/ops/incident_response.md` and page the on-call rotation.
- Knowledge sharing: document findings in `docs/` and surface major updates in the fortnightly platform sync.
- Access requests or compliance concerns: contact the Governance team referenced in the [Contributor Access & Compliance Policy](docs/compliance/CONTRIBUTOR_ACCESS_POLICY.md).

By consolidating gameplay, backend, web3, and operational tooling in a single monorepo, RiftLine enables tightly coupled iteration across teams while maintaining the guardrails required for a regulated, live-service economy.
