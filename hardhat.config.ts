import { defineConfig } from "hardhat/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";

const MONAD_RPC = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";

export default defineConfig({
  plugins: [hardhatViem, hardhatNodeTestRunner],
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true },
  },
  networks: {
    hardhat: { type: "edr-simulated", chainType: "l1" },
    monadTestnet: {
      type: "http",
      chainType: "l1",
      url: MONAD_RPC,
      chainId: 10143,
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
    },
  },
});
