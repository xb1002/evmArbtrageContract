import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  mocha: {
    timeout: 60 * 1000,
  },
  networks: {
    arbitrum: {
      chainId: 42161,
      url: "https://arbitrum-one-rpc.publicnode.com",
    },
  },
};

export default config;
