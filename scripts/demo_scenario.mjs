// SplitPool multi-member demo scenario — REAL Monad testnet transactions.
// Alice (deployer + MCP agent key), Bob, Carol, Dana.
// Flow: fund members -> create pool -> join -> agent parses + records expenses ->
//       balance_sheet -> suggest_settlements -> debtors settle on-chain -> creditors withdraw.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  createPublicClient, createWalletClient, http, parseEther, formatEther,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const RPC = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const EXPLORER = "https://testnet.monadexplorer.com/tx/";
const chain = {
  id: 10143, name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};
const { address: CONTRACT, abi: ABI } = JSON.parse(readFileSync("docs/contract.json", "utf8"));
const pub = createPublicClient({ chain, transport: http(RPC) });

const evidence = { contract: CONTRACT, chainId: 10143, txs: {}, expenses: [], notes: [] };
const logTx = (label, hash) => {
  evidence.txs[label] = { hash, url: EXPLORER + hash };
  console.log(`  tx ${label}: ${hash}\n     ${EXPLORER + hash}`);
};

// ---- keys: deployer from .deployer-key; demo members generated once, persisted locally ----
mkdirSync("evidence", { recursive: true });
const alice = privateKeyToAccount(readFileSync(".deployer-key", "utf8").trim());
let memberKeys;
if (existsSync(".demo-keys.json")) {
  memberKeys = JSON.parse(readFileSync(".demo-keys.json", "utf8"));
} else {
  memberKeys = [generatePrivateKey(), generatePrivateKey(), generatePrivateKey()];
  writeFileSync(".demo-keys.json", JSON.stringify(memberKeys), { mode: 0o600 });
}
const [bob, carol, dana] = memberKeys.map((k) => privateKeyToAccount(k));
const wallets = Object.fromEntries(
  [["alice", alice], ["bob", bob], ["carol", carol], ["dana", dana]].map(([n, a]) => [
    n, createWalletClient({ account: a, chain, transport: http(RPC) }),
  ])
);
evidence.accounts = { alice: alice.address, bob: bob.address, carol: carol.address, dana: dana.address };
console.log("accounts:", JSON.stringify(evidence.accounts, null, 2));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Monad testnet public RPC is flaky under rapid-fire txs: retry reverts with backoff.
async function send(name, walletName, tx) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const hash = await wallets[walletName].writeContract({ address: CONTRACT, abi: ABI, gas: 300000n, ...tx });
      const rcpt = await pub.waitForTransactionReceipt({ hash });
      logTx(name + (attempt > 1 ? `-retry${attempt}` : ""), hash);
      if (rcpt.status === "success") return hash;
      lastErr = new Error(`${name} reverted (attempt ${attempt})`);
    } catch (e) {
      lastErr = e;
      console.log(`  ${name} attempt ${attempt} failed: ${String(e.shortMessage || e.message).slice(0, 120)}`);
    }
    await sleep(3000 * attempt);
  }
  throw lastErr;
}

// ---- 1. fund members with gas money from deployer (testnet MON, $0) ----
console.log("\n== 1. fund demo members ==");
for (const [n, a] of [["bob", bob], ["carol", carol], ["dana", dana]]) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const bal = await pub.getBalance({ address: a.address });
    if (bal >= parseEther("0.35")) {
      console.log(`  ${n} funded (${formatEther(bal)} MON)`);
      evidence.notes.push(`${n} funded ${formatEther(bal)} MON`);
      break;
    }
    let funded = false, lastErr;
    for (let fattempt = 1; fattempt <= 4 && !funded; fattempt++) {
      try {
        const hash = await wallets.alice.sendTransaction({ to: a.address, value: parseEther("0.4"), gas: 30000n });
        const rcpt = await pub.waitForTransactionReceipt({ hash });
        logTx(`fund-${n}${fattempt > 1 ? "-retry" + fattempt : ""}`, hash);
        if (rcpt.status !== "success") { lastErr = new Error("reverted"); await sleep(3000 * fattempt); continue; }
        funded = true;
      } catch (e) {
        lastErr = e;
        console.log(`  fund-${n} attempt ${fattempt} failed: ${String(e.shortMessage || e.message).slice(0, 120)}`);
        await sleep(3000 * fattempt);
      }
    }
    if (!funded) throw lastErr;
    const after = await pub.getBalance({ address: a.address });
    console.log(`  ${n} balance after funding tx: ${formatEther(after)} MON`);
    if (after < parseEther("0.05") && attempt === 3) throw new Error(`funding ${n} failed 3x`);
  }
}

// ---- 2. alice creates the pool ----
console.log("\n== 2. create pool ==");
const poolId = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "poolCount" });
await send("createPool", "alice", { functionName: "createPool", args: ["metropolis hacker house"], gas: 500000n });
evidence.poolId = poolId.toString();
console.log("  poolId:", poolId.toString());

// ---- 3. members join (each from their own account) ----
console.log("\n== 3. members join ==");
for (const n of ["bob", "carol", "dana"]) {
  await send(`join-${n}`, n, { functionName: "joinPool", args: [poolId] });
}

// ---- 4. MCP agent: parse free-text expenses, record them on-chain ----
console.log("\n== 4. MCP agent records expenses ==");
const mcp = new Client({ name: "demo", version: "0.1.0" });
await mcp.connect(new StdioClientTransport({
  command: "node", args: ["agent/server.mjs"],
  env: { ...process.env, SPLITPOOL_ADDRESS: CONTRACT, AGENT_KEY: readFileSync(".deployer-key", "utf8").trim() },
}));
const tools = await mcp.listTools();
console.log("  MCP tools:", tools.tools.map((t) => t.name).join(", "));

const A = evidence.accounts;
const EXPENSES = [
  { text: "airport rideshare $0.12 split 4 ways", payer: A.alice, bens: [A.alice, A.bob, A.carol, A.dana] },
  { text: "hotel night one $0.20 split 3 ways", payer: A.bob, bens: [A.bob, A.carol, A.dana] }, // alice skipped
  { text: "team dinner $0.16 split 4 ways", payer: A.carol, bens: [A.alice, A.bob, A.carol, A.dana] },
  { text: "coffee and snacks $0.04 split 2 ways", payer: A.dana, bens: [A.dana, A.alice] }, // just two
];
for (const e of EXPENSES) {
  const parsed = JSON.parse((await mcp.callTool({ name: "parse_expense", arguments: { text: e.text } })).content[0].text);
  console.log(`  parsed: "${e.text}" ->`, JSON.stringify(parsed));
  let hash, ok = false;
  for (let eattempt = 1; eattempt <= 4 && !ok; eattempt++) {
    const r = await mcp.callTool({
      name: "record_expense",
      arguments: {
        poolId: Number(poolId), payer: e.payer, beneficiaries: e.bens,
        amountMon: String(parsed.amount), memo: parsed.memo,
      },
    });
    hash = r.content[0].text.replace("recordExpense tx: ", "");
    const rcpt = await pub.waitForTransactionReceipt({ hash });
    if (rcpt.status === "success") { ok = true; break; }
    console.log(`  recordExpense attempt ${eattempt} reverted, retrying…`);
    await new Promise((r2) => setTimeout(r2, 3000 * eattempt));
  }
  if (!ok) throw new Error(`recordExpense failed for "${e.text}"`);
  logTx(`expense-${parsed.memo.replace(/\W+/g, "-")}`, hash);
  evidence.expenses.push({ text: e.text, parsed, hash });
}

// ---- 5. balance sheet via MCP ----
console.log("\n== 5. balance sheet (MCP balance_sheet) ==");
const sheet = JSON.parse((await mcp.callTool({ name: "balance_sheet", arguments: { poolId: Number(poolId) } })).content[0].text);
console.table ? console.log(JSON.stringify(sheet, null, 2)) : null;
evidence.balanceSheetBefore = sheet;

// ---- 6. settlement suggestions via MCP ----
console.log("\n== 6. suggested settlements (MCP suggest_settlements) ==");
const sugg = JSON.parse((await mcp.callTool({ name: "suggest_settlements", arguments: { poolId: Number(poolId) } })).content[0].text);
console.log(JSON.stringify(sugg, null, 2));
evidence.suggestedSettlements = sugg;

// ---- 7. debtors settle on-chain with exactly what they owe ----
console.log("\n== 7. debtors settle on-chain ==");
const nameOf = Object.fromEntries(Object.entries(A).map(([n, a]) => [a.toLowerCase(), n]));
for (const [n, acct] of [["alice", alice], ["bob", bob], ["carol", carol], ["dana", dana]]) {
  const net = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "netBalance", args: [poolId, acct.address] });
  if (net < 0n) {
    console.log(`  ${n} owes ${formatEther(-net)} MON -> settle()`);
    await send(`settle-${n}`, n, { functionName: "settle", args: [poolId], value: -net, gas: 300000n });
  } else {
    console.log(`  ${n} net +${formatEther(net)} MON (creditor, no settle)`);
    evidence.notes.push(`${n} creditor +${formatEther(net)}`);
  }
}

// ---- 8. creditors withdraw ----
console.log("\n== 8. creditors withdraw ==");
for (const [n, acct] of [["alice", alice], ["bob", bob], ["carol", carol], ["dana", dana]]) {
  const net = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "netBalance", args: [poolId, acct.address] });
  if (net > 0n) {
    await send(`withdraw-${n}`, n, { functionName: "withdrawCredits", args: [poolId], gas: 300000n });
  }
}

// ---- 9. final state ----
console.log("\n== 9. final state ==");
const finalSheet = JSON.parse((await mcp.callTool({ name: "balance_sheet", arguments: { poolId: Number(poolId) } })).content[0].text);
console.log(JSON.stringify(finalSheet, null, 2));
const contractBal = await pub.getBalance({ address: CONTRACT });
console.log("  contract balance:", formatEther(contractBal), "MON");
evidence.balanceSheetAfter = finalSheet;
evidence.finalContractBalanceMon = formatEther(contractBal);

await mcp.close();
writeFileSync("evidence/demo-scenario.json", JSON.stringify(evidence, null, 2));
console.log("\nevidence written to evidence/demo-scenario.json");
console.log("DEMO SCENARIO COMPLETE — all transactions real, on Monad testnet (chainId 10143)");
