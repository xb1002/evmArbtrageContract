import { ethers } from "hardhat";
import { Token, PoolInfo } from "./type";

type BytesLike = string | Uint8Array;
type PathParams = string | number | bigint;
export function generatePath(pathParams: PathParams[]): string {
  // 确保输入的(参数数量-1)/3是整数
  const n = (pathParams.length - 1) / 3;
  if (n % 1 !== 0) {
    throw new Error("invalid path params");
  }
  let formatPathParams: BytesLike[] = [];
  for (let i = 0; i < n; i++) {
    formatPathParams.push(
      pathParams[i * 3] as string, //address
      ethers.toBeHex(pathParams[i * 3 + 1], 3), //fee
      ethers.toBeHex(pathParams[i * 3 + 2], 1) //dexId
    );
  }
  formatPathParams.push(pathParams[pathParams.length - 1] as string);
  return ethers.concat(formatPathParams);
}

// 测试函数
function testGeneratePath() {
  const weth: Token = {
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  };
  const usdc: Token = {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  };
  const pool0 = new PoolInfo(weth, usdc, 500, 0);
  const pool1 = new PoolInfo(usdc, weth, 100, 0);
  let path = generatePath([
    weth.address,
    pool0.fee,
    pool0.dexId,
    usdc.address,
    pool1.fee,
    pool1.dexId,
    weth.address,
  ]);
  console.log(path);
}

// test
// testGeneratePath();
