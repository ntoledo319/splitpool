import { network } from "hardhat";
import { readFileSync, writeFileSync } from "node:fs";

const { viem } = await network.connect();
const publicClient = await viem.getPublicClient();
console.log("chain:", await publicClient.getChainId());

const pool = await viem.deployContract("SplitPool");
console.log("SplitPool deployed:", pool.address);

const artifact = JSON.parse(readFileSync("artifacts/contracts/SplitPool.sol/SplitPool.json", "utf8"));
writeFileSync(
  "web/contract.json",
  JSON.stringify({ address: pool.address, abi: artifact.abi, chainId: 10143 }, null, 2)
);
console.log("wrote web/contract.json");
