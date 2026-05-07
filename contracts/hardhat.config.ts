import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import "dotenv/config";

const amoyUrl = process.env.POLYGON_AMOY_RPC_URL ?? "";
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    amoy: {
      chainId: 80002,
      url: amoyUrl,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
};

export default config;
