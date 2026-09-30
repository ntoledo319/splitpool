# SplitPool — Monad Metropolis 2026 entry (Mint / fastcash-0924)

**Track:** Consumer Products & Payments — "shared wallets and group spending that settle up without an intermediary."

SplitPool is an agent-native shared expense pool:
a group creates a pool on Monad, members deposit MON (testnet), an MCP agent
turns receipts/chat into ledger entries, and anyone can settle net balances
on-chain in one click. No intermediary, no spreadsheet, no "I'll pay you back later."

## Layout

- `contracts/` — Solidity pool contract (Hardhat, Monad testnet target)
- `docs/` — static dApp (ethers v6 via CDN, MetaMask + Monad testnet), GitHub Pages root
- `agent/` — MCP server: expense-ledger tools an AI agent can call
- `scripts/` — build/deploy/ops helpers (incl. CDP registration probes)

## Status

See `STATUS.md`. $0 spend: Monad testnet + faucet only, never mainnet funds.
