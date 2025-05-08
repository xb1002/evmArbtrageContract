import { PoolInfo, Token, Pool, Slot2 } from "./type";
import { calPoolAddress } from "./getPoolAddress";
import { IUniswapV3Pool, GetHelper, IGetHelper } from "../../typechain-types";
import { valueTokens } from "./valueTokens";
import { ethers } from "hardhat";

// 所有的feeTier
const uniswapV3FeeTiers = [100, 500, 3000, 10000];
const pancakeV3FeeTiers = [100, 500, 2500, 10000];

// 这里用于查看Pool的时候通过Factory定位到使用哪一个dex
let factoryToDexIds = new Map<string, number>();
// uniswapV3Factory
factoryToDexIds.set("0x1F98431c8aD98523631AE4a59f267346ea31F984", 0);
// pancakeV3Factory
factoryToDexIds.set("0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865", 1);

// type IGetSlot1Helper.Slot1Struct = {
//     factory: AddressLike;
//     token0: AddressLike;
//     token1: AddressLike;
//     reserve0: BigNumberish;
//     reserve1: BigNumberish;
//     sqrtPriceX96: BigNumberish;
//     liquidity: BigNumberish;
// }

// 全局变量
let pools: Pool[] = [];
let getHelperContract: GetHelper;
// 部署GetHelper合约
async function deployContract() {
  const getHelperFactory = await ethers.getContractFactory("GetHelper");
  getHelperContract = await getHelperFactory.deploy();
  await getHelperContract.waitForDeployment();
}

// getSlot1与getSlot2这两个函数需要在GetHelper部署之后调用
// slot1包括构造Pool的所有信息
async function getSlot1(pairAddress: string): Promise<IGetHelper.Slot1Struct> {
  let slot1: IGetHelper.Slot1Struct = await getHelperContract.getSlot1(
    pairAddress
  );
  return slot1;
}
// slot2只包括liquidity、sqrtPriceX96、reserve0、reserve1
async function getSlot2(pairAddress: string): Promise<IGetHelper.Slot2Struct> {
  let slot2: IGetHelper.Slot2Struct = await getHelperContract.getSlot2(
    pairAddress
  );
  return slot2;
}

// 调用之前确保pairAddress是一个合约地址
async function getPoolFromPairAddress(pairAddress: string): Promise<Pool> {
  // 调用RPC查看Pool信息
  let slot1 = await getSlot1(pairAddress);
  let token0: Token = {
    name: slot1.token0.name,
    symbol: slot1.token0.symbol,
    decimals: Number(slot1.token0.decimals),
    address: slot1.token0.tokenAddress.toString(),
  };
  let token1: Token = {
    name: slot1.token1.name,
    symbol: slot1.token1.symbol,
    decimals: Number(slot1.token1.decimals),
    address: slot1.token1.tokenAddress.toString(),
  };
  let pool = new Pool(
    token0,
    token1,
    Number(slot1.fee),
    factoryToDexIds.get(slot1.factory.toString())!
  );
  let slot2: Slot2 = {
    reserve0: slot1.reserve0 as number,
    reserve1: slot1.reserve1 as number,
    sqrtPriceX96: slot1.sqrtPriceX96 as number,
    liquidity: slot1.liquidity as number,
  };
  pool.updateSlot2(slot2);
  return pool;
}

// 通过接受两个token的地址以及fee、dexId生成Pool的地址
// 并且检查这个地址是否是一个合约,是则返回Pool,否则返回null
async function getPoolFromTokenPair(
  token0Address: string,
  token1Address: string,
  fee: number,
  dexId: number
): Promise<Pool | null> {
  // 生成pair地址
  let pairAddress = calPoolAddress(token0Address, token1Address, fee, dexId);
  // 检查是否是合约
  if (!(await isContract(pairAddress))) return null;
  let pool = await getPoolFromPairAddress(pairAddress);
  return pool;
}

// 通过getCode查看地址是否是合约
async function isContract(address: string) {
  let isContractFlag = true;
  try {
    let code = await ethers.provider.getCode(address);
    if (code == "0x") {
      isContractFlag = false;
    }
  } catch (e) {
    isContractFlag = false;
  }
  return isContractFlag;
}

async function test() {
  // 部署合约
  await deployContract();
  console.log("合约部署到", await getHelperContract.getAddress());
  // 根据合约地址连接合约
  // let getHelperContractAddress = "0xF16C65eB389650C212f817A9b901628ce9C5e790";
  // getHelperContract = (await ethers.getContractFactory("GetHelper")).attach(
  //   getHelperContractAddress
  // ) as GetHelper;

  // 测试
  // let pairAddress = "0xa95b0F5a65a769d82AB4F3e82842E45B8bbAf101";
  let weth: Token = valueTokens.find((token) => token.symbol === "WETH")!;
  // let usdc: Token = valueTokens.find((token) => token.symbol === "USDC")!;
  let pendle: Token = {
    name: "Pendle",
    symbol: "PENDLE",
    decimals: 18,
    address: "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
  };

  let pool = await getPoolFromTokenPair(pendle.address, weth.address, 2500, 1);
  if (pool) {
    pool.updatePrice();
    pool.updateTvl();
    console.log(pool);
  } else {
    console.log("pool不存在");
  }
  // 查看slot2
  // let slot2 = await getSlot2(pairAddress);
  // console.log(slot2);
}
test();
