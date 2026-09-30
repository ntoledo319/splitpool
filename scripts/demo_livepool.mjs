// Create a fresh LIVE pool for the video dApp segment: 4 members, 3 expenses,
// left UNSETTLED so the dApp shows real nonzero balances. Real testnet txs.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "node:fs";

const RPC = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const EXPLORER = "https://testnet.monadexplorer.com/tx/";
const chain = { id: 10143, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
const { address: CONTRACT, abi: ABI } = JSON.parse(readFileSync("docs/contract.json", "utf8"));
const pub = createPublicClient({ chain, transport: http(RPC) });

const alice = privateKeyToAccount(readFileSync(".deployer-key", "utf8").trim());
const [bobK, carolK, danaK] = JSON.parse(readFileSync(".demo-keys.json", "utf8"));
const [bob, carol, dana] = [bobK, carolK, danaK].map((k) => privateKeyToAccount(k));
const wallets = Object.fromEntries([["alice", alice], ["bob", bob], ["carol", carol], ["dana", dana]]
  .map(([n, a]) => [n, createWalletClient({ account: a, chain, transport: http(RPC) })]));
const A = { alice: alice.address, bob: bob.address, carol: carol.address, dana: dana.address };

const evidence = { contract: CONTRACT, txs: {}, purpose: "live unsettled pool for video dApp segment" };
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
    } catch (e) { lastErr = e; console.log(`  ${name} attempt ${attempt}: ${String(e.shortMessage || e.message).slice(0, 120)}`); }
    await sleep(3000 * attempt);
  }
  throw lastErr;
}

const poolId = await pub.readContract({ address: CONTRACT, abi: ABI, functionName: "poolCount" });
console.log("creating pool #", poolId.toString());
await send("createPool-video", "alice", { functionName: "createPool", args: ["live demo pool (video)"], gas: 500000n });
evidence.poolId = poolId.toString();
for (const n of ["bob", "carol", "dana"]) await send(`join-${n}`, n, { functionName: "joinPool", args: [poolId] });

const mcp = new Client({ name: "demo-video", version: "0.1.0" });
await mcp.connect(new StdioClientTransport({
  command: "node", args: ["agent/server.mjs"],
  env: { ...process.env, SPLITPOOL_ADDRESS: CONTRACT, AGENT_KEY: readFileSync(".deployer-key", "utf8").trim() },
}));
const EXPENSES = [
  { text: "hackathon pizza $0.03 split 4 ways", payer: A.alice, bens: [A.alice, A.bob, A.carol, A.dana] },
  { text: "whiteboard markers $0.02 split 2 ways", payer: A.carol, bens: [A.carol, A.dana] },
  { text: "late night tacos $0.045 split 3 ways", payer: A.dana, bens: [A.bob, A.carol, A.dana] },
];
for (const e of EXPENSES) {
  const parsed = JSON.parse((await mcp.callTool({ name: "parse_expense", arguments: { text: e.text } })).content[0].text);
  console.log(`  parsed: "${e.text}" ->`, JSON.stringify(parsed));
  let ok = false, hash;
  for (let at = 1; at <= 4 && !ok; at++) {
    const r = await mcp.callTool({ name: "record_expense", arguments: { poolId: Number(poolId), payer: e.payer, beneficiaries: e.bens, amountMon: String(parsed.amount), memo: parsed.memo } });
    hash = r.content[0].text.replace("recordExpense tx: ", "");
    const rcpt = await pub.waitForTransactionReceipt({ hash });
    if (rcpt.status === "success") ok = true; else { console.log(`  expense attempt ${at} reverted`); await sleep(3000 * at); }
  }
  if (!ok) throw new Error("recordExpense failed: " + e.text);
  logTx(`expense-${parsed.memo.replace(/\W+/g, "-")}`, hash);
}

const sheet = JSON.parse((await mcp.callTool({ name: "balance_sheet", arguments: { poolId: Number(poolId) } })).content[0].text);
console.log("live balance sheet:", JSON.stringify(sheet));
evidence.liveSheet = sheet;
await mcp.close();
writeFileSync("evidence/demo-livepool.json", JSON.stringify(evidence, null, 2));
console.log("LIVE POOL READY (unsettled) — pool #" + poolId.toString());
