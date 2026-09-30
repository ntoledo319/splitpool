// SplitPool MCP server — gives any MCP-capable agent expense-ledger tools
// backed by the SplitPool contract on Monad testnet.
// Env: SPLITPOOL_ADDRESS (required for chain tools), AGENT_KEY (only for record_expense),
//      MONAD_RPC_URL (default https://testnet-rpc.monad.xyz)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";

const RPC = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

const ADDRESS = process.env.SPLITPOOL_ADDRESS;
const ABI = ADDRESS
  ? JSON.parse(readFileSync(new URL("../docs/contract.json", import.meta.url), "utf8")).abi
  : null;

const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC) });

// --- expense parsing (deterministic, reused from mermail expense-ledger patterns) ---
function parseExpense(text) {
  const amt = text.match(/(?:\$|MON|mon)?\s*(\d+(?:\.\d{1,4})?)/);
  const splitMatch = text.match(/split\s+(?:between|among|with)?\s*(\d+)?/i);
  const ways = splitMatch?.[1] ? parseInt(splitMatch[1]) : null;
  const memo = text.replace(/(?:\$|MON|mon)?\s*\d+(?:\.\d{1,4})?/g, "").replace(/split\s+\w+\s*\d*/gi, "").trim();
  return {
    amount: amt ? parseFloat(amt[1]) : null,
    splitWays: ways,
    memo: memo || text.trim(),
    needsDisambiguation: !amt,
  };
}

// minimal-cash-flow: reduce nets to the fewest settlement transfers
function suggestSettlements(members, nets) {
  const debtors = [], creditors = [];
  members.forEach((m, i) => {
    const n = Number(formatEther(nets[i]));
    if (n < -1e-9) debtors.push({ m, amt: -n });
    else if (n > 1e-9) creditors.push({ m, amt: n });
  });
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);
  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    transfers.push({ from: debtors[i].m, to: creditors[j].m, amountMon: +pay.toFixed(6) });
    debtors[i].amt -= pay; creditors[j].amt -= pay;
    if (debtors[i].amt < 1e-9) i++;
    if (creditors[j].amt < 1e-9) j++;
  }
  return transfers;
}

const server = new McpServer({ name: "splitpool", version: "0.1.0" });

server.tool(
  "parse_expense",
  "Parse a free-text expense line (e.g. 'dinner $90 split 3 ways') into structured form",
  { text: z.string() },
  async ({ text }) => ({ content: [{ type: "text", text: JSON.stringify(parseExpense(text), null, 2) }] })
);

server.tool(
  "balance_sheet",
  "Read a SplitPool pool's member list and net balances from Monad testnet",
  { poolId: z.number().int().nonnegative() },
  async ({ poolId }) => {
    if (!ADDRESS) throw new Error("SPLITPOOL_ADDRESS not set");
    const [members, nets] = await pub.readContract({
      address: ADDRESS, abi: ABI, functionName: "balanceSheet", args: [BigInt(poolId)],
    });
    const rows = members.map((m, i) => ({ member: m, netMon: formatEther(nets[i]) }));
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  }
);

server.tool(
  "suggest_settlements",
  "Compute the minimum set of transfers that settles everyone in a pool",
  { poolId: z.number().int().nonnegative() },
  async ({ poolId }) => {
    if (!ADDRESS) throw new Error("SPLITPOOL_ADDRESS not set");
    const [members, nets] = await pub.readContract({
      address: ADDRESS, abi: ABI, functionName: "balanceSheet", args: [BigInt(poolId)],
    });
    return { content: [{ type: "text", text: JSON.stringify(suggestSettlements(members, nets), null, 2) }] };
  }
);

server.tool(
  "record_expense",
  "Record a parsed expense on-chain (needs AGENT_KEY for a testnet account; never mainnet)",
  {
    poolId: z.number().int().nonnegative(),
    payer: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    beneficiaries: z.array(z.string().regex(/^0x[0-9a-fA-F]{40}$/)).min(1),
    amountMon: z.string(),
    memo: z.string().max(140),
  },
  async ({ poolId, payer, beneficiaries, amountMon, memo }) => {
    if (!ADDRESS) throw new Error("SPLITPOOL_ADDRESS not set");
    if (!process.env.AGENT_KEY) throw new Error("AGENT_KEY not set (testnet key only)");
    const account = privateKeyToAccount(process.env.AGENT_KEY);
    const wallet = createWalletClient({ account, chain: monadTestnet, transport: http(RPC) });
    const hash = await wallet.writeContract({
      address: ADDRESS, abi: ABI, functionName: "recordExpense",
      args: [BigInt(poolId), payer, beneficiaries, parseEther(amountMon), memo],
      gas: 400000n, // public-RPC gas estimation under-counts on Monad testnet
    });
    return { content: [{ type: "text", text: `recordExpense tx: ${hash}` }] };
  }
);

await server.connect(new StdioServerTransport());
