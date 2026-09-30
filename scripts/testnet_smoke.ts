import { network } from "hardhat";
import { parseEther, formatEther } from "viem";
import { readFileSync } from "node:fs";

const { viem } = await network.connect();
const [deployer] = await viem.getWalletClients();
const publicClient = await viem.getPublicClient();
const { address, abi } = JSON.parse(readFileSync("docs/contract.json", "utf8"));
console.log("contract:", address);

const hash = await deployer.writeContract({
  address, abi, functionName: "createPool", args: ["metropolis smoke test"],
});
const rcpt = await publicClient.waitForTransactionReceipt({ hash });
console.log("createPool tx:", hash, "status:", rcpt.status);

const poolId = await publicClient.readContract({ address, abi, functionName: "poolCount" }) - 1n;
const me = deployer.account.address;
const h2 = await deployer.writeContract({
  address, abi, functionName: "recordExpense",
  args: [poolId, me, [me], parseEther("0.5"), "self-expense sanity"],
});
await publicClient.waitForTransactionReceipt({ hash: h2 });

const [members, nets] = await publicClient.readContract({
  address, abi, functionName: "balanceSheet", args: [poolId],
});
console.log("pool", poolId.toString(), "members:", members, "nets:", nets.map((n) => formatEther(n)));
console.log("ON-CHAIN SMOKE OK");
