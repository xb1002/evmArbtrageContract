import { ethers } from "hardhat";
import { expect, assert } from "chai";
import {
  SingleSwap,
  SwapRouter,
  ISingleSwap,
  ISwapRouter,
  IWETH,
  IERC20,
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
const wbtc: Token = {
  name: "Wrapped Bitcoin",
  symbol: "WBTC",
  decimals: 8,
  address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
};

describe("测试SwapRouter合约", () => {
  let singleSwapContract: SingleSwap;
  let swapRouterContract: SwapRouter;
  let wethContract: IWETH;
  let usdcContract: IERC20;
  let wbtcContract: IERC20;
  let signer: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  before(async () => {
    // signer
    signer = (await ethers.getSigners())[0];
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
    // 获取weth、usdc、wbtc合约
    wethContract = await ethers.getContractAt("IWETH", weth.address);
    usdcContract = await ethers.getContractAt("IERC20", usdc.address);
    wbtcContract = await ethers.getContractAt("IERC20", wbtc.address);
    // 存入一点WETH，1000
    await wethContract.deposit({ value: BigInt(1000 * 10 ** weth.decimals) });
  });
  beforeEach(async () => {
    // 每次测试前，将mine一个块
    await ethers.provider.send("evm_mine", []);
  });

  describe("测试getSupportDexName函数", () => {
    let dexNames: string[];
    before(async () => {
      dexNames = await swapRouterContract.getSupportDexName();
    });
    it("第一个dex应该是Uniswap V3", async () => {
      assert.equal(dexNames[0], "Uniswap V3");
    });
    it("第二个dex应该是Pancake V3", async () => {
      assert.equal(dexNames[1], "Pancake V3");
    });
    it("dex数量应该是2", async () => {
      assert.equal(dexNames.length, 2);
    });
  });

  describe("测试singleSwap函数", () => {
    it("将1个weth兑换为usdc", async () => {
      const amount = BigInt(1 * 10 ** weth.decimals);
      // 调用singleSwap函数
      const params: ISwapRouter.ExactInputSingleParamsContainDexIdStruct = {
        dexId: 0,
        params: {
          tokenIn: weth.address,
          tokenOut: usdc.address,
          fee: 3000,
          recipient: signer.address,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24),
          amountIn: amount,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        },
      };
      // 查看weth、usdc余额
      const wethBalanceBefore = await wethContract.balanceOf(signer.address);
      const usdcBalanceBefore = await usdcContract.balanceOf(signer.address);
      // 向singleSwap合约转账1个weth，注意这里并不是授权，因为在转账会在swap函数中使用
      await wethContract.transfer(
        await swapRouterContract.getAddress(),
        amount
      );
      // staticCall,预览结果
      const amountOut = await swapRouterContract.singleSwap.staticCall(params);
      // 执行singleSwap函数
      let tx = await swapRouterContract.singleSwap(params);
      await tx.wait();
      // 查看weth、usdc余额
      const wethBalanceAfter = await wethContract.balanceOf(signer.address);
      const usdcBalanceAfter = await usdcContract.balanceOf(signer.address);
      assert.equal(wethBalanceBefore - wethBalanceAfter, amount);
      assert.equal(usdcBalanceAfter - usdcBalanceBefore, amountOut);
    });
  });
  describe("测试swap函数", () => {
    it("执行单个pool的swap: weth->usdc", async () => {
      const amountIn: bigint = BigInt(1 * 10 ** weth.decimals);
      const path = ethers.concat([
        weth.address,
        ethers.toBeHex(3000, 3),
        ethers.toBeHex(0, 1),
        usdc.address,
      ]);
      const params: ISwapRouter.ExactInputParamsStruct = {
        path: path,
        recipient: signer.address,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24),
        amountIn: amountIn,
        amountOutMinimum: 0,
      };
      // 向SwapRouter合约approve
      await wethContract.approve(
        await swapRouterContract.getAddress(),
        amountIn
      );
      // 查看weth、usdc余额
      const wethBalanceBefore = await wethContract.balanceOf(signer.address);
      const usdcBalanceBefore = await usdcContract.balanceOf(signer.address);
      // staticCall,预览结果
      const amountOut = await swapRouterContract.swap.staticCall(params);
      // 执行swap函数
      let tx = await swapRouterContract.swap(params);
      await tx.wait();
      // 查看weth、usdc余额
      const wethBalanceAfter = await wethContract.balanceOf(signer.address);
      const usdcBalanceAfter = await usdcContract.balanceOf(signer.address);
      assert.equal(wethBalanceBefore - wethBalanceAfter, amountIn);
      assert.equal(usdcBalanceAfter - usdcBalanceBefore, amountOut);
    });
    it("执行多个pool的swap: weth->usdc->wbtc", async () => {
      const amountIn: bigint = BigInt(1 * 10 ** weth.decimals);
      const path = ethers.concat([
        weth.address,
        ethers.toBeHex(3000, 3),
        ethers.toBeHex(0, 1),
        usdc.address,
        ethers.toBeHex(500, 3),
        ethers.toBeHex(1, 1),
        wbtc.address,
      ]);
      const params: ISwapRouter.ExactInputParamsStruct = {
        path: path,
        recipient: signer.address,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24),
        amountIn: amountIn,
        amountOutMinimum: 0,
      };
      // 向SwapRouter合约approve
      await wethContract.approve(
        await swapRouterContract.getAddress(),
        amountIn
      );
      // 查看weth、usdc、wbtc余额
      const wethBalanceBefore = await wethContract.balanceOf(signer.address);
      const usdcBalanceBefore = await usdcContract.balanceOf(signer.address);
      const wbtcBalanceBefore = await wbtcContract.balanceOf(signer.address);
      // staticCall,预览结果
      const amountOut = await swapRouterContract.swap.staticCall(params);
      // 执行swap函数
      let tx = await swapRouterContract.swap(params);
      await tx.wait();
      // 查看weth、usdc余额
      const wethBalanceAfter = await wethContract.balanceOf(signer.address);
      const usdcBalanceAfter = await usdcContract.balanceOf(signer.address);
      const wbtcBalanceAfter = await wbtcContract.balanceOf(signer.address);
      assert.equal(wethBalanceBefore - wethBalanceAfter, amountIn);
      assert.equal(usdcBalanceAfter - usdcBalanceBefore, 0n);
      assert.equal(wbtcBalanceAfter - wbtcBalanceBefore, amountOut);
    });
  });
});
