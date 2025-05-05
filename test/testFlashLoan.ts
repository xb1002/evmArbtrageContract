import { ethers } from "hardhat";
import { expect, assert } from "chai";
import {
  FlashLoan,
  ISingleSwap,
  ISwapRouter,
  IWETH,
  IERC20,
  IFlashLoan,
} from "../typechain-types";
import { bigint } from "hardhat/internal/core/params/argumentTypes";

type Token = {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
};

// 在arbtrum上测试
const uniswapV3RouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const pancakeV3RouterAddress = "0x1b81D678ffb9C0263b24A97847620C99d213eB14";

const uniswapV3FactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

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

const pool0: IFlashLoan.PoolInfoStruct = {
  token0: weth.address,
  token1: usdc.address,
  fee: 500,
};
const pool1: IFlashLoan.PoolInfoStruct = {
  token0: usdc.address,
  token1: weth.address,
  fee: 100,
};
const pool2: IFlashLoan.PoolInfoStruct = {
  token0: weth.address,
  token1: usdc.address,
  fee: 3000,
};

//测试
describe("测试FlashLoan合约", () => {
  let flashLoanContract: IFlashLoan;
  let swapRouterContract: ISwapRouter;
  let singleSwapContract: ISingleSwap;
  let wethContract: IWETH;
  let usdcContract: IERC20;
  let signer: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  before(async () => {
    // 部署SingleSwap合约
    const SingleSwap = await ethers.getContractFactory("SingleSwap");
    singleSwapContract = await SingleSwap.deploy(
      uniswapV3RouterAddress,
      pancakeV3RouterAddress
    );
    await singleSwapContract.deploymentTransaction()?.wait();
    // 部署SwapRouter合约
    const SwapRouter = await ethers.getContractFactory("SwapRouter");
    swapRouterContract = await SwapRouter.deploy(
      await singleSwapContract.getAddress()
    );
    await swapRouterContract.deploymentTransaction()?.wait();
    // 部署FlashLoan合约
    const FlashLoan = await ethers.getContractFactory("FlashLoan");
    flashLoanContract = await FlashLoan.deploy(
      uniswapV3FactoryAddress,
      await swapRouterContract.getAddress()
    );
    await flashLoanContract.deploymentTransaction()?.wait();
    // 获取weth、usdc合约
    wethContract = await ethers.getContractAt("IWETH", weth.address);
    usdcContract = await ethers.getContractAt("IERC20", usdc.address);
    // signer
    signer = (await ethers.getSigners())[0];
    // 存入一点weth，闪电贷并不需要，可以考虑注释掉
    const tx = await wethContract.deposit({
      value: BigInt(1000 * 10 ** weth.decimals),
    });
    await tx.wait();
  });
  beforeEach(async () => {
    // mine one block
    await ethers.provider.send("evm_mine", []);
  });

  describe("测试flashLoan", () => {
    // 先在pool2中买入大量的usdc
    before(async () => {
      const pathBefore = ethers.concat([
        weth.address,
        ethers.toBeHex(pool2.fee, 3),
        ethers.toBeHex(0, 1),
        usdc.address,
      ]);
      const paramsBefore: ISwapRouter.ExactInputParamsStruct = {
        path: pathBefore,
        recipient: signer.address,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
        amountIn: BigInt(100 * 10 ** weth.decimals),
        amountOutMinimum: 0,
      };
      // 先approve
      await wethContract.approve(
        await swapRouterContract.getAddress(),
        BigInt(100 * 10 ** weth.decimals)
      );
      // 执行swap
      const txBefore = await swapRouterContract.swap(paramsBefore);
      await txBefore.wait();
    });
    it("模拟闪电贷套利，usdc余额应该增加", async () => {
      // token0: weth, token1: usdc
      const amount0: bigint = BigInt(0);
      const amount1: bigint = BigInt(1000 * 10 ** usdc.decimals);
      const pool = pool0;
      const path = ethers.concat([
        usdc.address,
        ethers.toBeHex(pool2.fee, 3),
        ethers.toBeHex(0, 1),
        weth.address,
        ethers.toBeHex(pool1.fee, 3),
        ethers.toBeHex(0, 1),
        usdc.address,
      ]);
      const params: ISwapRouter.ExactInputParamsStruct = {
        path: path,
        recipient: signer.address,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
        amountIn: amount1,
        amountOutMinimum: 0,
      };
      // 执行flashLoan
      // 查看weth、usdc的余额
      const wethBalanceBefore = await wethContract.balanceOf(signer.address);
      const usdcBalanceBefore = await usdcContract.balanceOf(signer.address);
      const tx = await flashLoanContract.flashLoan(
        amount0,
        amount1,
        pool,
        params
      );
      await tx.wait();
      // 查看weth、usdc的余额
      const wethBalanceAfter = await wethContract.balanceOf(signer.address);
      const usdcBalanceAfter = await usdcContract.balanceOf(signer.address);
      assert.equal(
        wethBalanceAfter,
        wethBalanceBefore,
        "weth balance don't equal"
      );
      assert(
        usdcBalanceAfter > usdcBalanceBefore,
        "usdc balance don't increase"
      );
    });
  });
});
