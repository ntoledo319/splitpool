// Settle pool #4 on-chain for the v2 video: debtors settle, creditors withdraw.
// REAL Monad testnet txs, tight gas + retry/backoff (full-gas-limit charging documented).
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "node:fs";

const RPC = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const EXPLORER = "https://testnet.monadvision.com/tx/";
const chain = { id: 10143, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
const { address: CONTRACT, abi: ABI } = JSON.parse(readFileSync("docs/contract.json", "utf8"));
const pub = createPublicClient({ chain, transport: http(RPC) });
const POOL = 4n;

const alice = privateKeyToAccount(readFileSync(".deployer-key", "utf8").trim());
const [bobK, carolK, danaK] = JSON.parse(readFileSync(".demo-keys.json", "utf8"));
const [bob, carol, dana] = [bobK, carolK, danaK].map((k) => privateKeyToAccount(k));
const wallets = Object.fromEntries([["alice", alice], ["bob", bob], ["carol", carol], ["dana", dana]]
  .map(([n, a]) => [n, createWalletClient({ account: a, chain, transport: http(RPC) })]));

const evidence = { poolId: "4", contract: CONTRACT, txs: {}, note: "pool 4 write-path settlement for v2 video" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function logTx(label, hash) {
  evidence.txs[label] = { hash, url: EXPLORER + hash };
  console.log(`  tx ${label}: ${hash}`);
}
async function send(name, walletName, tx) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const gas = attempt <= 2 ? 150000n : 300000n;
    try {
      const hash = await wallets[walletName].writeContract({ address: CONTRACT, abi: ABI, gas, ...tx });
      const rcpt = await pub.waitForTransactionReceipt({ hash });
      logTx(name + (attempt > 1 ? `-retry${attempt}` : ""), hash);
      if (rcpt.status === "success") return hash;
      lastErr = new Error("reverted");
    } catch (e) {
      lastErr = e;
      console.log(`  ${name} attempt ${attempt}: ${String(e.shortMessage || e.message).slice(0, 120)}`);
    }
    await sleep(3000 * attempt);
  }
  throw lastErr;
}

console.log("== pool #4 state BEFORE settlement ==");
const before = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "balanceSheet", args: [POOL] });
before[0].forEach((m, i) => console.log(`  ${m.slice(0, 10)}…  net ${formatEther(before[1][i])} MON`));

console.log("\n== debtors settle (bob -0.0225, carol -0.0125) ==");
for (const [n, acct] of [["bob", bob], ["carol", carol]]) {
  const net = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "netBalance", args: [POOL, acct.address] });
  if (net < 0n) {
    console.log(`  ${n} settles ${formatEther(-net)} MON`);
    await send(`settle-${n}`, n, { functionName: "settle", args: [POOL], value: -net });
  }
}

console.log("\n== creditors withdraw (alice +0.0225, dana +0.0125) ==");
for (const [n, acct] of [["alice", alice], ["dana", dana]]) {
  const net = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "netBalance", args: [POOL, acct.address] });
  if (net > 0n) {
    console.log(`  ${n} withdraws ${formatEther(net)} MON`);
    await send(`withdraw-${n}`, n, { functionName: "withdrawCredits", args: [POOL] });
  }
}

console.log("\n== pool #4 state AFTER settlement ==");
const after = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "balanceSheet", args: [POOL] });
const rows = after[0].map((m, i) => ({ member: m, netMon: formatEther(after[1][i]) }));
rows.forEach((r) => console.log(`  ${r.member.slice(0, 10)}…  net ${r.netMon} MON`));
evidence.afterSheet = rows;
writeFileSync("evidence/pool4-settle.json", JSON.stringify(evidence, null, 2));
console.log("\nevidence written to evidence/pool4-settle.json");
console.log("POOL 4 SETTLED — all real Monad testnet transactions");
