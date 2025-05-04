import { ethers } from "hardhat";
import { Pool } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";

// UniswapV3 creationCode
const POOL_INIT_CODE_HASH =
  "0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54";

// 主网地址
const factoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

function calPoolAddress(token0: string, token1: string, fee: number) {
  // 对token排序
  if (!token0.startsWith("0x")) {
    token0 = "0x" + token0;
  }
  if (!token1.startsWith("0x")) {
    token1 = "0x" + token1;
  }
  if (BigInt(token0) >= BigInt(token1)) {
    let temp = token0;
    token0 = token1;
    token1 = temp;
  }
  //   计算salt
  const salt = ethers.solidityPackedKeccak256(
    ["bytes"],
    [
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24"],
        [token0, token1, fee]
      ),
    ]
  );
  console.log(salt);
  const poolAddress = ethers.getCreate2Address(
    factoryAddress,
    salt,
    POOL_INIT_CODE_HASH
  );
  return poolAddress;
}

const token0 = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const token1 = "0x6b175474e89094c44da98b954eedeac495271d0f";
const fee = 3000;
const poolAddress = calPoolAddress(token0, token1, fee);
console.log(poolAddress);
