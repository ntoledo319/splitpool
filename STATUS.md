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

## Sponsor bounties (recon 2026-09-30, from monad.xyz/metropolis prize cards + sponsor announcements)
| Bounty | Prize | Requirement | Fit for SplitPool? |
|---|---|---|---|
| Privy "Privy!" | $5,000 | Best use of Privy embedded wallets | FIT — email/social-login wallets so members join/settle without MetaMask; literally the "crypto that doesn't feel like crypto" thesis; dApp-only change |
| Envio "Best Use of Envio" | $1,000 | Index with Envio | FIT — pool event history/audit feed (expense list is a real product gap: dApp shows current nets only); config-driven, free hosted tier |
| Dynamic "Best Use of Dynamic" | $5,000 | Dynamic wallet SDK | ALTERNATIVE to Privy (same category — pick one, never both) |
| MetaMask "Best Agent Wallet Plugin" | $2,500 | Agent wallet plugin | STRETCH — scoped delegation so MCP agent key may only recordExpense (real security story); plugin API effort uncertain |
| Mera ×2 (passkey UX / "One Passkey, Many Keys") | $2,500 ea | Mera passkey accounts | STRETCH — claim-link onboarding for wallet-less members; contract-level passkey work > half day |
| Agora "Best Cross-Border Payments App" | $10,000 | Payments app, AUSD angle | BLOCKED — best conceptual fit (settle expenses in stablecoin) but no AUSD on Monad testnet (checked 0x0000…9012a: no code); mainnet would violate $0/testnet |
| Chainlink "Best workflow with CRE" | $3,000 | CRE workflow | NO — would replace the MCP agent's job with sponsor infra = checkbox integration |
| Nansen "Best use of Nansen" | $5,000 | Nansen API/CLI analytics | NO — wallet labels add nothing to expense splitting |
| Perpl API / Analytics ($5K/$3K), Kuru ×2 ($5K), Agora Mobile Trading ($10K) | — | trading apps | NO — trading theme, off-product |
| Aurora "Bring Any-Chain Liquidity" | $5,000 | Intents integration | NO — cross-chain settle is nice-to-have; NEAR intents > half day, $0 testnet path unclear |
| Alchemy ($1K), Kimi ($3K), Qwen ($5K), Hunyuan ($2K) | credits | use their platform/model | NO — credits not cash (KIMI-powered agent is cute, still credits) |
| Monad Foundation "Best Community Team Project" | $5,000 | community team | NO — solo entry |
| Cleanverse "Best Integration of CVI/CVA" | $2,000 | CVI/CVA integration | NO — no clear utility for group expenses |

**Verdict:** two honest, small, natural fits — **Privy ($5K)** and **Envio ($1K)**, both dApp-layer only,
no contract changes, ≤ half a day combined, $0 testnet. Privy integration would be: Privy SDK login
creating embedded wallets for members who join/settle from the dApp. Envio integration would be: index
PoolCreated/ExpenseRecorded/Settled/Withdrawn → "pool history" feed in the dApp. Agora ($10K) is the
dream fit but blocked (no testnet AUSD). NOT building any of this yet — decision needed before Oct 13.

## Next 3 steps
1. Ledger registers + submits before Oct 13 (outbox note updated).
2. Decide on Privy + Envio integrations (half day total, real utility) — see Sponsor bounties verdict above.
3. Keep repo + Pages up through Nov 3; answer judge questions.
