import { ethers } from "hardhat";
import { expect, assert } from "chai";
import {
  SingleSwap,
  SwapRouter,
  ISingleSwap,
  ISwapRouter,
  IWETH,
} from "../typechain-types";

type Token = {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
};

// 在arbtrum上测试
const uniswapV3RouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const pancakeV3RouterAddress = "0x1b81D678ffb9C0263b24A97847620C99d213eB14";
// 使用weth与usdc
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

describe("测试SwapRouter合约", () => {
  let singleSwapContract: SingleSwap;
  let swapRouterContract: SwapRouter;
  before(async () => {
    // 部署SingleSwap合约
    const SingleSwap = await ethers.getContractFactory("SingleSwap");
    singleSwapContract = await SingleSwap.deploy(
      uniswapV3RouterAddress,
      pancakeV3RouterAddress
    );
    await singleSwapContract.deploymentTransaction()?.wait();
    console.log(
      "SingleSwap合约已部署, 地址为: ",
      await singleSwapContract.getAddress()
    );
    // 部署SwapRouter合约
    const SwapRouter = await ethers.getContractFactory("SwapRouter");
    swapRouterContract = await SwapRouter.deploy(
      await singleSwapContract.getAddress()
    );
    await swapRouterContract.deploymentTransaction()?.wait();
    console.log(
      "SwapRouter合约已部署, 地址为: ",
      await swapRouterContract.getAddress()
    );
  });

  it("测试getSupportDexNames函数", async () => {
    const dexNames = await swapRouterContract.getSupportDexName();
    assert.equal(dexNames.length, 2);
    assert.equal(dexNames[0], "Uniswap V3");
    assert.equal(dexNames[1], "Pancake V3");
    console.log(dexNames);
  });
  it("测试singleSwap函数", async () => {
    // singer
    const signer = (await ethers.getSigners())[0];
    // 要交换的amount
    const amount = 10; // weth

    // 获取一些WETH
    const wethContract = (await ethers.getContractAt(
      "IWETH",
      weth.address
    )) as IWETH;
    await wethContract.deposit({ value: BigInt(amount * 10 ** weth.decimals) });
    // 查看weth余额
    const wethBalance = await wethContract.balanceOf(signer.address);
    console.log("wethBalance", wethBalance / BigInt(10 ** weth.decimals));

    // 查看usdc余额
    const usdcContract = await ethers.getContractAt("IERC20", usdc.address);
    const usdcBalanceBefore = await usdcContract.balanceOf(signer.address);
    console.log(
      "usdcBalanceBefore",
      usdcBalanceBefore / BigInt(10 ** usdc.decimals)
    );

    // 先向singleSwap合约授权10weth
    await wethContract.approve(
      await swapRouterContract.getAddress(),
      BigInt(amount * 10 ** weth.decimals)
    );
    const params: ISwapRouter.ExactInputSingleParamsContainDexIdStruct = {
      dexId: 0,
      params: {
        tokenIn: weth.address,
        tokenOut: usdc.address,
        fee: 3000,
        recipient: signer.address,
        amountIn: BigInt(amount * 10 ** weth.decimals),
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      },
    };
    let tx = await swapRouterContract.singleSwap(params);
    await tx.wait();
    // 查看usdc余额
    const usdcBalanceAfter = await usdcContract.balanceOf(signer.address);
    console.log("usdcBalance", usdcBalanceAfter / BigInt(10 ** usdc.decimals));
    assert(
      usdcBalanceAfter > usdcBalanceBefore,
      "usdcBalanceAfter not greater than usdcBalanceBefore"
    );
  });
});
