# RiftLine

> A unified, cross-platform game ecosystem developed by **KlusterTech, Inc.** that merges a high-fidelity Unreal Engine 5 experie
nce, a connected mobile companion, service-oriented backend systems, and on-chain economies.
>
> **Proprietary Notice** – This repository is confidential KlusterTech property. Access is restricted to approved contributors u
nder active NDA agreements. See [KlusterTech Proprietary Notice](docs/legal/PROPRIETARY_NOTICE.md) and [Contributor Access & Com
pliance Policy](docs/compliance/CONTRIBUTOR_ACCESS_POLICY.md).

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Strategic Pillars](#strategic-pillars)
3. [Repository Layout](#repository-layout)
4. [Platform Architecture](#platform-architecture)
   - [Game Clients](#game-clients)
   - [Backend & Real-time Services](#backend--real-time-services)
   - [Data Platform](#data-platform)
   - [Web3 & Smart Contracts](#web3--smart-contracts)
   - [Infrastructure & DevOps](#infrastructure--devops)
5. [Tooling & Automation](#tooling--automation)
6. [Environment Setup](#environment-setup)
   - [Prerequisites](#prerequisites)
   - [Clone the Repository](#clone-the-repository)
   - [Bootstrapping Core Services](#bootstrapping-core-services)
   - [Working with Unreal Engine](#working-with-unreal-engine)
   - [Mobile Companion Bootstrapping](#mobile-companion-bootstrapping)
   - [Smart Contract Development](#smart-contract-development)
   - [Web3 Secrets & Wallets](#web3-secrets--wallets)
7. [Documentation & Knowledge Base](#documentation--knowledge-base)
8. [Security, Compliance & Access Control](#security-compliance--access-control)
9. [Roadmap & Next Steps](#roadmap--next-steps)
10. [Support & Communication](#support--communication)
11. [Appendix: README Patch Automation](#appendix-readme-patch-automation)

## Executive Summary

RiftLine is the flagship KlusterTech gaming initiative designed to bridge premium gameplay with persistent digital economies and
 second-screen participation. The monorepo centralizes every layer required to ship and operate the ecosystem: client applicati
ons, gameplay services, blockchain integrations, infrastructure-as-code, documentation, and operational tooling. Consolidating t
hese assets ensures tightly orchestrated delivery across engineering, creative, operations, and compliance teams.

The current codebase provides a robust scaffold with intentional placeholders (`.gitkeep` markers) for major system verticals. T
hese structures allow teams to collaborate without merge contention while incrementally introducing production-grade components.

## Strategic Pillars

- **Immersive Core Gameplay** – Unreal Engine 5 project (`apps/engine-ue5/`) anchors the player experience with cinematic visual
s and responsive combat loops.
- **Connected Companion Experience** – Native mobile shells (`apps/companion-app/`) support social touchpoints, inventory managem
ent, and wallet flows synchronized with the core game.
- **Service-driven Architecture** – Backend services leverage a modular stack (API gateway, Nakama authoritative services, domai
n microservices) to deliver low-latency multiplayer and live operations.
- **Web3-enabled Economies** – Hardhat and Foundry workspaces, along with paymaster and Thirdweb scaffolding, provide a pathway f
or tokenized assets, gas abstraction, and wallet interoperability.
- **Operational Excellence** – Docker, Kubernetes, Terraform, and CI/CD placeholders codify infrastructure strategy from local d
ev to production while preserving compliance traceability.
- **Confidential Collaboration** – Proprietary policies, onboarding workflows, and documentation guardrails ensure the project r
emains secure and aligned with KlusterTech governance standards.

## Repository Layout

| Path | Purpose |
| ---- | ------- |
| `apps/engine-ue5/` | Unreal Engine 5 project root containing `Riftline.uproject`, configuration templates, and staged directori
es for source, plugins, and content. |
| `apps/companion-app/` | Mobile companion scaffolding with platform-specific shells (`android/`, `ios/`), shared assets, and tes
t harness placeholders. |
| `backend/api-gateway/` | TypeScript gateway service blueprint with `package.json`/`tsconfig.json` and reserved folders for src,
 tests, and logging. |
| `backend/nakama/` | Nakama configuration (`config/nakama.yml`), module placeholders, and migration directories for real-time g
ameplay logic. |
| `backend/services/` | Domain microservice stubs (indexer, notifications, webhooks) to support specialized workloads and extens
ions. |
| `backend/db/` | Schema, migration, and seed directories establishing the data platform's versioning strategy. |
| `backend/web3/` | Environment templates for paymaster, bundler, and Thirdweb engine integrations aligned to the RiftLine token
 (`RFT`). |
| `contracts/hardhat/` | Hardhat workspace targeting Solidity `0.8.23` with scripts, tests, and dependency management. |
| `contracts/foundry/` | Foundry scaffold (`src/`, `script/`, `test/`, `lib/`) for rapid Solidity prototyping and fuzzing. |
| `infra/docker/` | Docker Compose stack and container templates powering local development environments. |
| `infra/k8s/` | Base manifests and environment overlays (`dev/`, `staging/`, `prod/`) for Kubernetes deployments. |
| `infra/terraform/` | Terraform module and environment stubs for provisioning cloud infrastructure. |
| `infra/ci/` | Reserved directories for GitHub and GitLab automation pipelines. |
| `scripts/` | Operational scripts for development workflows, database operations, deployments, and workstation setup. |
| `docs/` | Knowledge base covering tokenomics, architecture, API, mobile, engine, legal, compliance, and operations guidance. |
| `assets/` | Centralized repository of creative, UI, font, icon, and legal placeholders shared across products. |
| `pnpm-workspace.yaml` | Placeholder for future pnpm workspace orchestration across services and clients. |

## Platform Architecture

### Game Clients

- **Unreal Engine 5** – `apps/engine-ue5/` contains the authoritative UE5 project configuration with placeholders for `Config/`,
 `Content/`, `Plugins/`, and `Source/`. Teams should extend these directories with gameplay code, Blueprints, assets, and editor
 settings. Maintain deterministic builds by versioning project settings and documenting platform-specific requirements in `docs/
engine/`.
- **Companion Application** – `apps/companion-app/` organizes native shells for Android and iOS alongside shared `assets/`, `app/
`, and `tests/` directories. The companion experience is designed for social interactions, inventory review, second-screen feat
ures, and wallet management linked to the UE5 session lifecycle.

### Backend & Real-time Services

- **API Gateway** – `backend/api-gateway/` will expose REST/WebSocket entry points, orchestrate authentication, and mediate betw
een clients, Nakama, and domain services. Populate `src/` with controllers, middleware, and schema validations as features solid
ify.
- **Nakama Runtime** – `backend/nakama/` houses authoritative match logic. The `config/nakama.yml` stub already points to a JavaS
cript/TypeScript runtime output directory (`./modules/ts/build`). Use this area to author authentication hooks, economy systems,
 match loops, and RPC endpoints.
- **Domain Services** – `backend/services/` collects specialized workloads such as blockchain indexers, notification dispatchers,
 and webhook processors. Each service directory begins with `.gitkeep` placeholders so teams can select appropriate frameworks a
nd SLAs without structural churn.

### Data Platform

The `backend/db/` directory provides canonical locations for migrations (`migrations/`), schema definitions (`schemas/`), and se
d data (`seed/`). Align database changes with application code through versioned migration scripts and use the automation hook i
n `scripts/db/` to codify repeatable operations (e.g., `migrate.sh`).

### Web3 & Smart Contracts

- **Hardhat Workspace** – `contracts/hardhat/` is configured for Solidity `0.8.23` with OpenZeppelin dependencies and a default s
ource path of `./contracts/weapons`. Use `npm run compile` and `npm run test` to iterate locally.
- **Foundry Workspace** – `contracts/foundry/` mirrors Foundry conventions for fast prototyping and fuzz testing. Populate `foun
ndry.toml` and `remappings.txt` as modules mature.
- **Execution Infrastructure** – `backend/web3/` includes `.env.example` templates for the paymaster, bundler, and Thirdweb engin
e services. These templates define required secrets such as RPC URLs, private keys, and chain identifiers for RiftLine's RFT tok
en operations.

### Infrastructure & DevOps

- **Local Orchestration** – `infra/docker/docker-compose.local.yml` provisions PostgreSQL and Redis containers and serves as the
foundation for a richer local stack (Nakama, API gateway, Web3 services). Extend the Compose file as services graduate into acti
ve development.
- **Kubernetes Blueprints** – `infra/k8s/` offers base manifests (`namespace.yaml`, `ingress.yaml`, `configmap.yaml`, `secret-exa
mple.yaml`) and environment overlays that will anchor cluster deployments across dev, staging, and production.
- **Terraform Scaffolding** – `infra/terraform/` organizes infrastructure-as-code modules and environment states to codify cloud
 network, compute, and managed services.
- **CI/CD Foundations** – `infra/ci/github/` and `infra/ci/gitlab/` directories reserve space for pipeline definitions covering b
uilds, tests, security scanning, and deployment automation.

## Tooling & Automation

- **Development Scripts** – `scripts/dev/start.sh` and `scripts/dev/stop.sh` wrap Docker Compose invocations to consistently boo
tstrap or teardown the local services stack.
- **Database Utilities** – `scripts/db/` is the staging area for migration and seeding automation. Expand `migrate.sh` to encapsu
late your preferred migration toolchain.
- **Deployment Hooks** – Deployment helpers now live alongside CI workflows; leverage the `.github/workflows` stack instead of the legacy `scripts/deploy/local.sh` stub.
- **Workstation Setup** – `scripts/ops/wsl-setup.sh` is reserved for Windows Subsystem for Linux onboarding tasks and can be expa
nded with environment hardening steps.

## Environment Setup

### Prerequisites

- [Git](https://git-scm.com/) for source control and patch management.
- [Node.js 18+](https://nodejs.org/) and [npm](https://www.npmjs.com/) for TypeScript services and Hardhat tooling. [pnpm](https
://pnpm.io/) is optional for monorepo package management once workspaces are defined.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Compose v2 for local service orchestration.
- Unreal Engine 5.x with the necessary platform SDKs for Windows/macOS development.
- Native Android/iOS toolchains (Android Studio, Xcode) for companion application builds.
- Access to KlusterTech-managed secrets vaults or secure credential stores for Web3 services.

### Clone the Repository

```bash
git clone ssh://<your-klustertech-host>/RiftLine.git
cd RiftLine
```

Ensure you are operating within the KlusterTech-managed Git hosting environment. Public mirrors and forks are prohibited.

### Bootstrapping Core Services

1. Confirm Docker Desktop (or your preferred container runtime) is running.
2. Start the local infrastructure baseline:
   ```bash
   ./scripts/dev/start.sh
   ```
   This command runs `docker compose -f infra/docker/docker-compose.local.yml up -d`, provisioning PostgreSQL and Redis.
3. When you finish your session, stop the stack to conserve resources:
   ```bash
   ./scripts/dev/stop.sh
   ```
4. Extend the Compose file with additional services (e.g., Nakama, API gateway) as functionality comes online.

### Working with Unreal Engine

- Open `apps/engine-ue5/Riftline.uproject` using the approved Unreal Engine build.
- Configure platform-specific settings (input, rendering, packaging) within the `Config/` directory and commit deterministic chan
ge sets.
- Coordinate binary asset versioning using Git LFS if large media files are introduced. Consult `docs/engine/` for team norms whe
n populated.

### Mobile Companion Bootstrapping

- The `apps/companion-app/` directory contains `.gitkeep` placeholders for Android (`android/`), iOS (`ios/`), shared `app/`, `a
ssets/`, and `tests/` trees. Introduce your framework of choice (e.g., React Native, Kotlin Multiplatform, Swift) while maintain
ing consistent project structure.
- Document build steps, dependency managers, and integration tests under `docs/mobile/` as they are established.

### Smart Contract Development

```bash
cd contracts/hardhat
npm install
npm run compile
npm run test
```

Use the Foundry scaffold (`contracts/foundry/`) when you need fast Solidity prototyping or fuzz testing. Keep deployment scripts,
 ABI outputs, and audits versioned within their respective directories.

### Web3 Secrets & Wallets

1. Copy environment templates before populating secrets:
   ```bash
   cp backend/web3/paymaster/.env.example backend/web3/paymaster/.env
   cp backend/web3/bundler/.env.example backend/web3/bundler/.env
   cp backend/web3/thirdweb-engine/.env.example backend/web3/thirdweb-engine/.env
   ```
2. Populate values such as `RPC_URL`, `PAYMASTER_PRIVATE_KEY`, `ENTRYPOINT_ADDR`, `BUNDLER_PRIVATE_KEY`, `THIRDWEB_SECRET_KEY`,
 and `CHAIN_ID` according to the network you are targeting.
3. Store populated `.env` files in approved secret management solutions. Never commit secrets or distribute them over unauthorize
d channels.

## Documentation & Knowledge Base

The `docs/` directory is the canonical knowledge repository. Key areas include:

- `docs/tokenomics/` – Token overview (`README.md`) and placeholders for allocation modeling, vesting schedules, and economy sim
ulations.
- `docs/architecture/`, `docs/api/`, `docs/engine/`, `docs/mobile/`, `docs/contracts/`, `docs/ops/` – Domain-specific folders fo
r technical designs, runbooks, and playbooks.
- `docs/legal/` – Home to the [KlusterTech Proprietary Notice](docs/legal/PROPRIETARY_NOTICE.md) and future legal guidance (e.g.
, licensing terms, partner agreements).
- `docs/compliance/` – Contains the [Contributor Access & Compliance Policy](docs/compliance/CONTRIBUTOR_ACCESS_POLICY.md) and w
ill expand to include security, privacy, and audit documentation.

Keep documentation synchronized with implementation progress. Every feature, service, or workflow should be reflected in the kno
wledge base to support rapid onboarding and audit readiness.

## Security, Compliance & Access Control

- Access to this repository is limited to team members and partners approved by KlusterTech leadership.
- Every contributor must review and comply with both the [Proprietary Notice](docs/legal/PROPRIETARY_NOTICE.md) and the [Contribu
tor Access & Compliance Policy](docs/compliance/CONTRIBUTOR_ACCESS_POLICY.md) prior to committing code.
- Secrets, credentials, and private keys must be managed through KlusterTech-sanctioned secret management systems.
- Notify the security team immediately upon detecting suspicious activity, credential exposure, or device compromise.
- External distribution, public discussions, or showcasing RiftLine materials outside authorized channels is strictly prohibited.

## Roadmap & Next Steps

The repository currently provides a structural foundation. Upcoming milestones include:

1. **Gameplay & Content** – Implement core gameplay loops, progression systems, and content pipelines within `apps/engine-ue5/`.
2. **Companion Experience** – Stand up mobile companion features, push notifications, and wallet UX across Android/iOS shells.
3. **Service Implementations** – Build out API gateway routes, Nakama modules, and microservices for matchmaking, inventory, ana
lytics, and live operations.
4. **Data & Observability** – Introduce migration tooling, seed data, telemetry pipelines, and monitoring dashboards.
5. **Web3 Integration** – Finalize smart contract deployments, paymaster flows, and wallet abstraction layers.
6. **Infrastructure Hardening** – Expand Docker, Kubernetes, Terraform, and CI/CD automation into fully managed environments wit
h observability and incident response playbooks.
7. **Compliance Maturity** – Populate legal, compliance, and operational documentation to meet internal audit and partner requir
ements.

Each milestone should be accompanied by updates to documentation, automation scripts, and testing coverage.

## Support & Communication

- Engage via KlusterTech's private collaboration channels (e.g., Slack, Teams) using organization-managed accounts.
- For access requests or offboarding, coordinate with the project sponsor and follow the [Contributor Access & Compliance Policy
](docs/compliance/CONTRIBUTOR_ACCESS_POLICY.md).
- For legal or security inquiries, contact the KlusterTech legal/security steering group through approved escalation paths.
- For build or operational issues, file tickets in the internal project management system referencing affected directories and se
rvices.

## Appendix: README Patch Automation

To reapply this README update (e.g., when bootstrapping a new clone), use the helper script located at `scripts/maintenance/apply
_readme_update.sh`. The script invokes `git apply` with the curated patch stored alongside it, ensuring the documentation stays s
ync across environments.

```bash
./scripts/maintenance/apply_readme_update.sh
```

> The patch script is intended for controlled environments. Verify your working tree is clean before running it, and review the
patch contents to confirm compatibility with your branch state.
