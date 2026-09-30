// Finish the pool #3 demo: fund dana from bob (alice is low), dana settles,
// creditors withdraw, final balance sheet. All REAL Monad testnet txs.
// Pool 3 state (from demo-console.log, run that reached step 7):
//   alice +0.03, bob +0.0633333…, carol +0.0233333…, dana -0.11666…
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "node:fs";

const RPC = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const EXPLORER = "https://testnet.monadexplorer.com/tx/";
const chain = { id: 10143, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
const { address: CONTRACT, abi: ABI } = JSON.parse(readFileSync("docs/contract.json", "utf8"));
const pub = createPublicClient({ chain, transport: http(RPC) });
const POOL = 3n;

const alice = privateKeyToAccount(readFileSync(".deployer-key", "utf8").trim());
const [bobK, carolK, danaK] = JSON.parse(readFileSync(".demo-keys.json", "utf8"));
const [bob, carol, dana] = [bobK, carolK, danaK].map((k) => privateKeyToAccount(k));
const wallets = Object.fromEntries([["alice", alice], ["bob", bob], ["carol", carol], ["dana", dana]]
  .map(([n, a]) => [n, createWalletClient({ account: a, chain, transport: http(RPC) })]));

const evidence = { poolId: "3", contract: CONTRACT, txs: {}, note: "settle/withdraw finish for pool 3; expenses recorded in demo-console.log run reaching step 7" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function logTx(label, hash) {
  evidence.txs[label] = { hash, url: EXPLORER + hash };
  console.log(`  tx ${label}: ${hash}\n     ${EXPLORER + hash}`);
}
async function send(name, walletName, tx) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const hash = await wallets[walletName].writeContract({ address: CONTRACT, abi: ABI, gas: 300000n, ...tx });
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

console.log("== A. bob funds dana 0.3 MON (alice is low after faucet drip) ==");
{
  const bal = await pub.getBalance({ address: dana.address });
  console.log("  dana balance:", formatEther(bal));
  if (bal < parseEther("0.25")) {
    const hash = await wallets.bob.sendTransaction({ to: dana.address, value: parseEther("0.3"), gas: 30000n });
    const rcpt = await pub.waitForTransactionReceipt({ hash });
    logTx("fund-dana-from-bob", hash);
    if (rcpt.status !== "success") throw new Error("fund-dana-from-bob reverted");
  }
  console.log("  dana balance now:", formatEther(await pub.getBalance({ address: dana.address })));
}

console.log("\n== B. dana settles debt on-chain ==");
const net = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "netBalance", args: [POOL, dana.address] });
console.log("  dana net:", formatEther(net));
if (net < 0n) {
  await send("settle-dana", "dana", { functionName: "settle", args: [POOL], value: -net });
} else console.log("  (already settled)");

console.log("\n== C. creditors withdraw ==");
for (const [n, acct] of [["alice", alice], ["bob", bob], ["carol", carol]]) {
  const cn = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "netBalance", args: [POOL, acct.address] });
  if (cn > 0n) {
    console.log(`  ${n} withdraws +${formatEther(cn)} MON`);
    await send(`withdraw-${n}`, n, { functionName: "withdrawCredits", args: [POOL] });
  }
}

console.log("\n== D. final state ==");
const [members, nets] = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "balanceSheet", args: [POOL] });
const finalRows = members.map((m, i) => ({ member: m, netMon: formatEther(nets[i]) }));
console.log(JSON.stringify(finalRows, null, 2));
const cbal = await pub.getBalance({ address: CONTRACT });
console.log("  contract balance:", formatEther(cbal), "MON (pool 3 leftovers may share contract with earlier pools)");
evidence.finalSheet = finalRows;
writeFileSync("evidence/demo-finish.json", JSON.stringify(evidence, null, 2));
console.log("\nevidence written to evidence/demo-finish.json");
console.log("SETTLE/WITHDRAW COMPLETE — all real Monad testnet transactions");
