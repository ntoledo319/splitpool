# STATUS — hack-metropolis (Mint) — 2026-09-30

**Pick:** Monad Metropolis — https://monad.xyz/metropolis (apply: hackathon.monad.xyz)
**Track:** Consumer Products & Payments ("shared wallets and group spending").
**Deadline:** 2026-10-13 submission; judging 10-14→27; winners 11-03.

## Why this pick / disqualifiers
- $250K+ USD pool ($30K/track + $25K grand champion + sponsors); global, solo OK; 13-day runway.
- Deliverable = working product + profile (demo, write-up, code link) — matches agent build speed.
- Solana Perps (Oct 9): Solana Foundation hackathons run with Colosseum → Hunter's cluster. Dropped.
- CLOCK IN (Oct 8): Seeker mobile/dApp-Store build, radiant.nexus acct unknown — high risk.
- Arbitrum (Oct 4): HackQuest reg closed Oct 2, 4 days left, prize partly milestone-locked grants.

## Registration state
- NOT registered: hackathon.monad.xyz is OAuth-only (Google/GitHub). Google session in Mint's
  Chrome = Nick's personal; no github.com web password for ntoledo319 → submit routes via Ledger.
- Handoff: outbox/mint-to-ledger-20260930-metropolis-submit.md (updated, package complete).

## Build state (all verified)
- Contract contracts/SplitPool.sol, 9/9 hardhat tests pass. Deployed Monad testnet (chain 10143):
  0xe2f7bbd5163b0acd695cc50c34c46109e7d7a4d4 (faucet 5 MON, $0 spend).
- dApp (ethers v6, read-only w/o wallet): https://ntoledo319.github.io/splitpool/ · repo github.com/ntoledo319/splitpool
- MCP agent agent/server.mjs (parse_expense, balance_sheet, suggest_settlements, record_expense) — smoke OK.

## Demo evidence (real testnet txs only)
- Pool #3: 4 members, 4 MCP-recorded expenses (uneven splits), settle + 3 withdrawals → all nets 0.
  evidence/pool3-events.json (recovered from chain), demo-console.log, demo-finish-console.log.
- Pool #4: left unsettled for the dApp video segment (evidence/demo-livepool.json), then settled
  on camera for video v2 (evidence/pool4-settle.json; settle-bob/carol + withdraw-alice/dana, all real).
- Quirk: Monad testnet charges FULL gas limit per tx; scripts use tight limits + retries.

## Submission package — COMPLETE → outbox/metropolis/
writeup.md (copy-paste fields) · splitpool-demo.mp4 (v2, 3m00s 720p captioned, adds pool #4 write-path
settle footage; v1 backup splitpool-demo-v1.mp4) · evidence.md (all tx hashes, incl. pool #4 settlement)

## Next 3 steps
1. Ledger registers + submits before Oct 13 (outbox note updated).
2. Optional: settle pool #4 on camera if judges want write-path UI footage.
3. Keep repo + Pages up through Nov 3; answer judge questions.
