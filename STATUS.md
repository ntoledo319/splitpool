# STATUS — hack-metropolis (Mint) — 2026-09-30

**Pick:** Monad Metropolis — https://monad.xyz/metropolis (apply: hackathon.monad.xyz)
**Track:** Consumer Products & Payments ("shared wallets and group spending").
**Deadline:** 2026-10-13 submission; judging 10-14→27; winners 11-03.

## Why this pick
- $250K+ USD pool: $30K/track (3 winners) + $25K grand champion + sponsor bounties; global, solo OK.
- 13-day runway (others: Arbitrum Oct 4, CLOCK IN Oct 8, Perps Oct 9).
- Deliverable = working product + public profile (demo, write-up, code link) — matches agent build speed.

## Disqualifiers
- Solana Perps & Prediction (Oct 9): Solana Foundation hackathons run with Colosseum → Hunter's cluster. Dropped.
- CLOCK IN (Oct 8): RadiantsDAO (not Colosseum) but requires Seeker mobile/dApp-Store build, radiant.nexus acct mechanics unknown — high risk.
- Arbitrum Open House (Oct 4): HackQuest registration closed Oct 2, only 4 days, prize partly milestone-locked grants.

## Registration state
- NOT registered. hackathon.monad.xyz is OAuth-only (Google or GitHub). No email+alias path.
- Google session in Mint's Chrome = Nick's personal (toledonick98) → per mission, final submit routes via Ledger.
- GitHub OAuth needs github.com web password for ntoledo319 — not available to Mint.
- Handoff note staged: outbox/mint-to-ledger-20260930-metropolis-submit.md. Registration = 1 OAuth click + profile; must happen before Oct 13.

## Build state (all verified)
- Contract `contracts/SplitPool.sol` — net-ledger expense pools. 9/9 hardhat tests pass (viaIR, solc 0.8.24).
- DEPLOYED Monad testnet (chain 10143): 0xe2f7bbd5163b0acd695cc50c34c46109e7d7a4d4 (faucet: 5 MON, $0).
- On-chain smoke passed: pool #0 created + expense recorded (scripts/testnet_smoke.ts).
- dApp docs/index.html (ethers v6 CDN) live: https://ntoledo319.github.io/splitpool/ ; repo: github.com/ntoledo319/splitpool
- MCP agent agent/server.mjs: parse_expense, balance_sheet, suggest_settlements, record_expense — stdio smoke OK.

## Next 3 steps
1. Multi-member demo pool on testnet (2-3 accounts), full split→settle→withdraw on-chain.
2. Record 2-3 min demo video (reuse work/mermail video tooling); write submission profile text.
3. Ledger registers + submits via OAuth before Oct 13 (handoff in outbox/).
