import { ethers } from "hardhat";

const weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const fee0 = 60;
const fee1 = 10;

const dexId0 = 0;
const dexId1 = 1;

// 将fee0和fee1转换为3bytes
const fee0Bytes = ethers.toBeHex(fee0, 3);
const fee1Bytes = ethers.toBeHex(fee1, 3);
console.log(fee0Bytes, fee1Bytes);

// 将dexId0和dexId1转换1bytes
const dexId0Bytes = ethers.toBeHex(dexId0, 1);
const dexId1Bytes = ethers.toBeHex(dexId1, 1);
console.log(dexId0Bytes, dexId1Bytes);

// 按照顺序 weth fee0 dexId0 usdc fee1 dexId1 usdt
const path = ethers.concat([
  weth,
  fee0Bytes,
  dexId0Bytes,
  usdc,
  fee1Bytes,
  dexId1Bytes,
  usdt,
]);
console.log(path);
