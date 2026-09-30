// Recover pool-3 lifecycle evidence from on-chain event logs (paginated eth_getLogs).
// The console log of the successful pool-3 run was overwritten by a later failed run;
// the chain itself is the source of truth. Anchors on the settle tx block.
import { createPublicClient, http, decodeEventLog, formatEther } from "viem";
import { readFileSync, writeFileSync } from "node:fs";

const { address, abi } = JSON.parse(readFileSync("docs/contract.json", "utf8"));
const pub = createPublicClient({ transport: http("https://testnet-rpc.monad.xyz") });
const SETTLE_TX = "0xc4786cb29f6894e6077e7abdcedd846bf8a28bf1f9356322116edf4752dcb15c";
const poolTopic = "0x" + (3n).toString(16).padStart(64, "0");

const rcpt = await pub.getTransactionReceipt({ hash: SETTLE_TX });
const anchor = rcpt.blockNumber;
console.log("settle block:", anchor);

const found = [];
const RANGE = 99n;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let to = anchor; to > anchor - 8000n && found.length < 12; to -= RANGE) {
  const from = to - RANGE + 1n;
  let logs;
  for (let at = 1; at <= 5; at++) {
    try {
      logs = await pub.request({
        method: "eth_getLogs",
        params: [{ address, fromBlock: "0x" + from.toString(16), toBlock: "0x" + to.toString(16), topics: [null, poolTopic] }],
      });
      break;
    } catch (e) {
      if (at === 5) throw e;
      await sleep(1200 * at); // public RPC rate limit: 25 req/s
    }
  }
  for (const l of logs) {
    const ev = decodeEventLog({ abi, data: l.data, topics: l.topics });
    found.push({
      event: ev.eventName, tx: l.transactionHash, block: parseInt(l.blockNumber, 16),
      detail:
        ev.eventName === "ExpenseRecorded" ? `${ev.args.memo} (${formatEther(ev.args.amount)} MON)` :
        ev.eventName === "PoolCreated" ? ev.args.name :
        ev.eventName === "Settled" ? `${formatEther(ev.args.paid)} MON` :
        ev.eventName === "Withdrawn" ? `${formatEther(ev.args.amount)} MON` :
        ev.args.member ?? "",
    });
  }
}
found.sort((a, b) => a.block - b.block);
for (const f of found) console.log(`${f.block}  ${f.event.padEnd(16)} ${f.detail}  ${f.tx}`);
console.log(`events found: ${found.length}`);
writeFileSync("evidence/pool3-events.json", JSON.stringify(found, null, 2));
console.log("written evidence/pool3-events.json");
