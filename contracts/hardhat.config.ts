import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import "dotenv/config";

const amoyUrl = process.env.POLYGON_AMOY_RPC_URL ?? "";
const polygonUrl = process.env.POLYGON_MAINNET_RPC_URL ?? process.env.POLYGON_RPC_URL ?? "https://polygon-bor-rpc.publicnode.com";
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const polygonScanApiKey = process.env.POLYGONSCAN_API_KEY ?? process.env.ETHERSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    amoy: {
      chainId: 80002,
      url: amoyUrl,
      accounts: deployerKey ? [deployerKey] : [],
    },
    polygon: {
      chainId: 137,
      url: polygonUrl,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
  etherscan: {
    apiKey: polygonScanApiKey,
    customChains: [
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://polygonscan.com",
        },
      },
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
};

export default config;
