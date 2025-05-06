import { ethers } from "hardhat";
import { Token, Factory } from "./type";

const UniswapV3Factory: Factory = {
  address: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  initCodeHash:
    "0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54",
};
const PancakeV3Factory: Factory = {
  // 这里实际上是PancakeV3PoolDeveloper的地址
  address: "0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9",
  initCodeHash:
    "0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2",
};

// 获取地址

export function calPoolAddress(
  token0: string,
  token1: string,
  fee: number,
  dexId: number
) {
  let factoryAddress;
  let initCodeHash;
  // 对token排序
  [token0, token1] =
    BigInt(token0) < BigInt(token1) ? [token0, token1] : [token1, token0];
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
  if (dexId == 0) {
    factoryAddress = UniswapV3Factory.address;
    initCodeHash = UniswapV3Factory.initCodeHash;
  } else if (dexId == 1) {
    factoryAddress = PancakeV3Factory.address;
    initCodeHash = PancakeV3Factory.initCodeHash;
  }
  // console.log(salt);
  const poolAddress = ethers.getCreate2Address(
    factoryAddress as string,
    salt,
    initCodeHash as string
  );
  return poolAddress;
}

function testGetPoolAddress() {
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
  const fee = 100;
  const uniswapPoolAddress = calPoolAddress(weth.address, usdc.address, fee, 0);
  const expectedUniswapPoolAddress =
    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F";
  if (uniswapPoolAddress == expectedUniswapPoolAddress) {
    console.log("testGetPoolAddress: 计算UniswapV3PoolAddress: 测试通过");
  } else {
    throw new Error("testGetPoolAddress: 计算UniswapV3PoolAddress: 测试失败");
  }
  const pancakePoolAddress = calPoolAddress(weth.address, usdc.address, fee, 1);
  const expectedPancakePoolAddress =
    "0x7fCDC35463E3770c2fB992716Cd070B63540b947";
  if (pancakePoolAddress == expectedPancakePoolAddress) {
    console.log("testGetPoolAddress: 计算PancakeV3PoolAddress: 测试通过");
  } else {
    throw new Error("testGetPoolAddress: 计算PancakeV3PoolAddress: 测试失败");
  }
}
// test
// testGetPoolAddress();
