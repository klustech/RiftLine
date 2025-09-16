# RiftLine

> A cross-platform game ecosystem that bridges real-time gameplay, companion experiences, and on-chain economies.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Highlights](#architecture-highlights)
3. [Monorepo Layout](#monorepo-layout)
4. [Core Components](#core-components)
   - [Game Clients](#game-clients)
   - [Backend Services](#backend-services)
   - [Web3 & Smart Contracts](#web3--smart-contracts)
   - [Infrastructure & Operations](#infrastructure--operations)
   - [Documentation & Assets](#documentation--assets)
5. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Clone the Repository](#clone-the-repository)
   - [Bootstrapping the Local Stack](#bootstrapping-the-local-stack)
   - [Smart Contract Workflow](#smart-contract-workflow)
   - [Web3 Configuration](#web3-configuration)
6. [Development Workflows](#development-workflows)
7. [Documentation](#documentation)
8. [Contributing](#contributing)
9. [License](#license)
10. [Project Roadmap](#project-roadmap)

## Overview

RiftLine is an ambitious, end-to-end game platform that combines a high-fidelity Unreal Engine 5 title, a connected mobile companion application, multiplayer services, and Web3-enabled economies. This monorepo acts as the single source of truth for game code, supporting services, operational tooling, and business documentation, enabling tightly aligned iteration across the ecosystem.

## Architecture Highlights

- **Cross-platform experiences** – A UE5 game client and a native companion application share assets, progression data, and event hooks.
- **Service-oriented backend** – API gateway, Nakama authoritative game services, and dedicated microservices coordinate gameplay, player data, notifications, and analytics pipelines.
- **On-chain integration** – Smart contracts, paymaster infrastructure, and Thirdweb engine components enable tokenized assets, seamless wallet flows, and gas abstractions.
- **Infrastructure as code** – Docker, Kubernetes, and Terraform definitions provide reproducible environments from local development to production.
- **Holistic documentation** – Tokenomics, legal, compliance, and operational playbooks live alongside source code to streamline cross-functional collaboration.

## Monorepo Layout

| Path | Description |
| ---- | ----------- |
| `apps/engine-ue5/` | Unreal Engine 5 project (`Riftline.uproject`) with source, config, plugin, and content roots for the flagship game client. |
| `apps/companion-app/` | Companion mobile application scaffold with Android/iOS native shells, shared assets, and test harnesses. |
| `backend/api-gateway/` | TypeScript gateway service scaffold including configuration for RiftLine token metadata. |
| `backend/nakama/` | Nakama real-time server configuration, TypeScript module stubs, and migration directories. |
| `backend/services/` | Placeholder microservices (indexer, notifications, webhooks) for extending backend capabilities. |
| `backend/db/` | Database schemas, migrations, and seeding scaffolding. |
| `backend/web3/` | Paymaster and Thirdweb engine environment templates for blockchain connectivity. |
| `contracts/hardhat/` | Hardhat workspace for Solidity contracts targeting compiler version 0.8.23. |
| `contracts/foundry/` | Foundry scaffolding for fast Solidity development and testing. |
| `infra/docker/` | Local Docker Compose stack and container templates for core services (PostgreSQL, Redis, Nakama, and more). |
| `infra/k8s/` | Base manifests and environment overlays for Kubernetes deployments. |
| `infra/terraform/` | Infrastructure provisioning stubs for cloud environments. |
| `scripts/` | Automation for development, database operations, deployments, and workstation setup. |
| `docs/` | Cross-domain documentation covering tokenomics, architecture, operations, and compliance. |
| `assets/` | Centralized art, UI, font, and legal asset placeholders shared across clients. |

## Core Components

### Game Clients

- **Unreal Engine 5 Game (`apps/engine-ue5/`)** – Contains the `Riftline.uproject` file, configuration directories, and content roots expected by UE5. Designers and engineers can collaborate on gameplay logic, Blueprints, and assets while keeping editor settings versioned.
- **Mobile Companion (`apps/companion-app/`)** – Provides Android and iOS native containers, shared app assets, and a testing harness. The companion app is intended for social features, second-screen experiences, and wallet management that complement the primary game.

### Backend Services

- **API Gateway (`backend/api-gateway/`)** – A TypeScript-based entry point for HTTP and WebSocket traffic. Token metadata is defined in `src/config/token.json`, and the `src` tree reserves space for controllers, routes, middleware, and schema validation.
- **Authoritative Game Services (`backend/nakama/`)** – Houses Nakama server configuration (`config/nakama.yml`) and TypeScript module scaffolding for authentication, economy, match logic, RPC endpoints, and Web3 hooks.
- **Domain Microservices (`backend/services/`)** – Organized for specialized workloads such as blockchain indexing, notification delivery, and webhook ingest. Each service directory ships with Git keepers, ready to be populated with frameworks that match its SLA.
- **Data Platform (`backend/db/`)** – Schemas, migrations, and seed data live here so that the operational database is explicitly versioned and testable.

### Web3 & Smart Contracts

- **Smart Contracts (`contracts/hardhat/`)** – Hardhat is preconfigured for Solidity `0.8.23`, references an upcoming `./contracts/weapons` source tree, and exposes `npm run compile`/`npm run test` commands for iterative development.
- **Alternative Tooling (`contracts/foundry/`)** – Includes canonical `src/`, `lib/`, and `test/` folders for teams preferring Foundry-based workflows.
- **Gas Abstraction & Wallet Tooling (`backend/web3/`)** – `.env.example` files for the paymaster and Thirdweb engine define required secrets such as RPC URLs, private keys, Thirdweb tokens, and chain IDs, enabling gasless or subsidized transactions.

### Infrastructure & Operations

- **Local Stack (`infra/docker/`)** – `docker-compose.local.yml` bootstraps PostgreSQL and Redis containers, forming the foundation for a local services mesh. Additional directories reserve configurations for Nakama, bundlers, engines, and supporting infrastructure.
- **Kubernetes (`infra/k8s/`)** – Base manifests (namespace, ingress, config map, secrets) and environment overlays (`dev`, `staging`, `prod`) standardize cluster deployments while remaining customizable per environment.
- **Terraform (`infra/terraform/`)** – Serves as the placeholder for infrastructure-as-code modules that define cloud networking, compute, and managed services aligned with RiftLine.
- **Continuous Integration (`infra/ci/`)** – GitHub and GitLab directories allow teams to codify pipelines for build, test, and deployment automation.

### Documentation & Assets

- **Tokenomics (`docs/tokenomics/`)** – Captures economic models, allocation plans, vesting schedules, and a high-level overview of the RiftLine token (RFT).
- **Cross-functional Docs (`docs/`)** – Stub folders for architecture, API, mobile, engine, legal, compliance, and operations encourage collaborative documentation.
- **Shared Assets (`assets/`)** – Organized repositories for UI kits, iconography, fonts, legal documents, and placeholder media shared between clients, marketing, and operations.

## Getting Started

### Prerequisites

- [Git](https://git-scm.com/) for source control.
- [Node.js](https://nodejs.org/) 18+ and [npm](https://www.npmjs.com/) for TypeScript services and Hardhat tooling.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Compose v2 for local infrastructure.
- [pnpm](https://pnpm.io/) (optional) if you prefer managing packages across workspaces.
- Unreal Engine 5, Android/iOS SDKs, and platform-specific dependencies for client development (installed separately).

### Clone the Repository

```bash
git clone https://github.com/<your-org>/RiftLine.git
cd RiftLine
```

### Bootstrapping the Local Stack

1. Ensure Docker Desktop is running.
2. Start core services (PostgreSQL, Redis, and future containers) with the helper script:

   ```bash
   ./scripts/dev/start.sh
   ```

3. When you are done, gracefully stop the stack:

   ```bash
   ./scripts/dev/stop.sh
   ```

The script executes `docker compose -f infra/docker/docker-compose.local.yml up -d`, so you can customize the Compose file to introduce Nakama, API gateway, or other services as they come online.

### Smart Contract Workflow

1. Install dependencies inside the Hardhat workspace:

   ```bash
   cd contracts/hardhat
   npm install
   ```

2. Compile Solidity sources (currently targeting `./contracts/weapons`):

   ```bash
   npm run compile
   ```

3. Execute the unit test suite:

   ```bash
   npm run test
   ```

4. Use the Foundry scaffold (`contracts/foundry/`) when rapid Solidity prototyping or fuzzing is required.

### Web3 Configuration

1. Duplicate the environment templates:

   ```bash
   cp backend/web3/paymaster/.env.example backend/web3/paymaster/.env
   cp backend/web3/thirdweb-engine/.env.example backend/web3/thirdweb-engine/.env
   ```

2. Populate secrets such as `RPC_URL`, `PAYMASTER_PRIVATE_KEY`, `THIRDWEB_SECRET_KEY`, and `CHAIN_ID` with values appropriate for your target network.
3. Never commit populated `.env` files to source control. Use your preferred secret management solution for shared environments.

## Development Workflows

- **API Gateway** – Extend controllers, routes, and middleware under `backend/api-gateway/src/`. Add schemas for request/response validation and implement service adapters that integrate with Nakama, the database, or blockchain indexers.
- **Nakama Modules** – Author game logic, match handlers, and RPC endpoints within `backend/nakama/modules/ts/src/`. Follow the existing folder taxonomy (`auth`, `economy`, `match`, `rpc`, `web3`) for clean separation of concerns.
- **Database Migrations** – Add migration scripts to `backend/db/migrations/` and version your schema changes alongside code updates.
- **Automation Scripts** – Extend the shell utilities in `scripts/` to standardize operational tasks such as database resets, local deployments, or analytics backfills.

## Documentation

Centralize specs, design decisions, and compliance artifacts under `docs/`. The tokenomics section already includes a brief overview (`README.md`) and placeholders for allocation, vesting, and economy modeling. Populate the other discipline-specific directories (architecture, API, engine, mobile, ops, legal, compliance) as you formalize processes and product decisions.

## Contributing

1. Create a feature branch that scopes your changes clearly.
2. Follow the conventions implied by directory names and keep services decoupled.
3. Update or add documentation under `docs/` whenever behavior changes.
4. Include or update automated scripts/tests to validate your work.
5. Submit a pull request with a concise summary, testing evidence, and any relevant diagrams or screenshots.

## License

License details are pending. Consult the `assets/legal/` directory or project leadership before distributing proprietary materials.

## Project Roadmap

This repository is an evolving foundation. Many folders currently contain `.gitkeep` placeholders so teams can begin collaborating without structural conflicts. As vertical slices are implemented, expect:

- Expanded API gateway handlers and contract schemas.
- Nakama match logic, progression systems, and economy services.
- Fully defined Docker, Kubernetes, and Terraform configurations for each environment.
- Production-ready companion app features, including wallet integration and push notifications.
- Comprehensive documentation for compliance, legal, and operational readiness.

Contributions that push the platform toward these milestones are welcome.

