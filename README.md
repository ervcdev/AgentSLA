# AgentSLA

Autonomous SLA enforcement for AI agents on Kite AI.

AgentSLA enables trust-minimized service contracts between agents: funds are locked in escrow, service quality is evaluated, and settlement (release or penalty) is executed on-chain.

## Why this project matters

In agentic commerce, agents pay for APIs, data feeds, or compute services with no native quality guarantees.
AgentSLA introduces programmable SLAs so agents can enforce:

- latency thresholds,
- uptime requirements,
- payment penalties for underperformance.

This is designed for the **Kite AI Global Hackathon 2026** (`Agentic Commerce` track).

## Architecture

AgentSLA has 3 main components:

1. **Smart Contract (`SLAEscrow.sol`)**
   - Stores SLA terms (provider, amount, latency, uptime, duration, penalty).
   - Locks funds in escrow.
   - Settles to provider or applies penalty to consumer.

2. **Evaluator Service (`agent/server.ts`)**
   - Exposes an x402-compatible endpoint.
   - Verifies and settles payments via Pieverse facilitator.
   - Returns SLA verdict (`met` or `not met`) based on metrics.

3. **Frontend (`frontend/`)**
   - Wallet connect (RainbowKit + wagmi).
   - Create SLA form.
   - List SLA statuses (`created`, `funded`, `settled`, `penalized`).

## End-to-end flow

1. User/agent creates an SLA from the frontend.
2. `SLAEscrow` stores terms on Kite testnet.
3. Consumer funds escrow.
4. Evaluator service checks SLA metrics (latency/uptime).
5. Settlement is executed on-chain:
   - `releaseFunds()` if SLA is met
   - `penalize()` if SLA is not met

## Network configuration (Kite testnet)

- **Chain ID:** `2368`
- **RPC URL:** `https://rpc-testnet.gokite.ai/`
- **Explorer:** `https://testnet.kitescan.ai/`
- **Test USDT token:** `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63`
- **x402 Facilitator (Pieverse):** `https://facilitator.pieverse.io`

## Deployed contract

- **SLAEscrow (Kite testnet):** `0x285ECC7b5cA76dF0324D6A416fF95A694f21b58e`

## Repository structure

```text
/contracts        -> SLAEscrow.sol + hardhat config and deployment scripts
/agent            -> x402 evaluator service
/frontend         -> Next.js demo UI
/README.md        -> project overview and deployment guide
```

## Local setup

### 1) Smart contract

From project root:

```bash
npm install
npx hardhat compile
npx hardhat run --network kiteTestnet scripts/deploy-slaescrow.ts
```

Required root `.env` values:

- `PRIVATE_KEY`
- `KITE_RPC_URL=https://rpc-testnet.gokite.ai/`
- `KITE_CHAIN_ID=2368`

### 2) Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

Required `frontend/.env.local`:

```env
NEXT_PUBLIC_PROJECT_ID=5c73ca2a490daab030c8fa547092c6c6
NEXT_PUBLIC_SLA_ESCROW_ADDRESS=0x285ECC7b5cA76dF0324D6A416fF95A694f21b58e
NEXT_PUBLIC_KITE_RPC=https://rpc-testnet.gokite.ai/
```

### 3) Evaluator service (backend)

From `agent/`:

```bash
npm install
npm run dev
```

Required `agent/.env`:

```env
SERVICE_WALLET_ADDRESS=0x9A5e7de1362B45315Bf84832aFa15d87968B55bc
USDT_ADDRESS=0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63
PIEVERSE_URL=https://facilitator.pieverse.io
SERVICE_URL=https://YOUR-RAILWAY-APP.railway.app
PORT=3001
```

## Production deployment (Checkpoint 2)

### Vercel (Frontend)

Set in Vercel project settings:

- `NEXT_PUBLIC_PROJECT_ID`
- `NEXT_PUBLIC_SLA_ESCROW_ADDRESS`
- `NEXT_PUBLIC_KITE_RPC`

### Railway (Backend)

Set in Railway project settings:

- `SERVICE_WALLET_ADDRESS`
- `USDT_ADDRESS`
- `PIEVERSE_URL`
- `SERVICE_URL`
- `PORT`

## Judge-facing summary

AgentSLA demonstrates autonomous, on-chain SLA enforcement for agent-to-agent commerce on Kite:

- payment guarantees with escrow,
- machine-verifiable quality constraints,
- automatic dispute-free settlement.

This directly addresses the trust and reliability gap in autonomous service markets.
