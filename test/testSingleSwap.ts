import { ethers } from "hardhat";
import { expect, assert } from "chai";
import { SingleSwap, ISingleSwap, IWETH, IERC20 } from "../typechain-types";
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

describe("测试SingleSwap合约", () => {
  // 先部署一个SingleSwap合约
  let singleSwapContract: SingleSwap;
  before(async () => {
    const SingleSwap = await ethers.getContractFactory("SingleSwap");
    singleSwapContract = await SingleSwap.deploy(
      uniswapV3RouterAddress,
      pancakeV3RouterAddress
    );
    await singleSwapContract.deploymentTransaction()?.wait();
  });
  beforeEach(async () => {
    // 在每一次测试前都mine一个块
    await ethers.provider.send("evm_mine", []);
  });

  describe("测试getExchanges函数", () => {
    let exchanges: ISingleSwap.ExchangeStruct[];
    let exchangesCount: bigint;
    before(async () => {
      [exchanges, exchangesCount] = await singleSwapContract.getExchanges();
    });
    it("exchange[0]应该是uniswap V3", async () => {
      assert(exchanges[0].swapRouterAddress == uniswapV3RouterAddress);
    });
    it("exchange[1]应该是pancake V3", async () => {
      assert(exchanges[1].swapRouterAddress == pancakeV3RouterAddress);
    });
    it("exchangesCount应该是2", async () => {
      assert(exchangesCount == 2n);
    });
  });

  describe("测试singleSwap函数", () => {
    let signer: Awaited<ReturnType<typeof ethers.getSigners>>[0];
    let amount: bigint;
    let wethContract: IWETH;
    let usdcContract: IERC20;
    before(async () => {
      signer = (await ethers.getSigners())[0];
      amount = BigInt(10) * BigInt(10 ** weth.decimals);
      wethContract = await ethers.getContractAt("IWETH", weth.address);
      usdcContract = await ethers.getContractAt("IERC20", usdc.address);

      // 获取一些WETH
      await wethContract.deposit({ value: BigInt(1000 * 10 ** 18) });
    });
    it("使用uniswapV3执行swap", async () => {
      const params: ISingleSwap.ExactInputSingleParamsStruct = {
        tokenIn: weth.address,
        tokenOut: usdc.address,
        fee: 3000,
        recipient: signer,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24),
        amountIn: amount,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      };
      // 向合约授权amount
      await wethContract.approve(
        await singleSwapContract.getAddress(),
        params.amountIn
      );
      const wethBalanceBefore = await wethContract.balanceOf(signer.address);
      const usdcBalanceBefore = await usdcContract.balanceOf(signer.address);
      // 预览swap结果
      const amountOut = await singleSwapContract.singleSwap.staticCall(
        0,
        params
      );
      // 执行swap
      let tx = await singleSwapContract.singleSwap(0, params);
      await tx.wait();
      // 获取结果
      const wethBalanceAfter = await wethContract.balanceOf(signer.address);
      const usdcBalanceAfter = await usdcContract.balanceOf(signer.address);
      // 断言
      assert(
        wethBalanceBefore - wethBalanceAfter == params.amountIn,
        "wethBalanceBefore - wethBalanceAfter not equal to params.amountIn"
      );
      assert(
        usdcBalanceAfter - usdcBalanceBefore == amountOut,
        "usdcBalanceAfter - usdcBalanceBefore not equal to amountOut"
      );
    });
    it("使用pancakeV3执行swap", async () => {
      const params: ISingleSwap.ExactInputSingleParamsStruct = {
        tokenIn: weth.address,
        tokenOut: usdc.address,
        fee: 500,
        recipient: signer,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24),
        amountIn: amount,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      };
      // 向合约授权amount
      await wethContract.approve(
        await singleSwapContract.getAddress(),
        params.amountIn
      );
      const wethBalanceBefore = await wethContract.balanceOf(signer.address);
      const usdcBalanceBefore = await usdcContract.balanceOf(signer.address);
      // 预览swap结果
      const amountOut = await singleSwapContract.singleSwap.staticCall(
        1,
        params
      );
      // 执行swap
      let tx = await singleSwapContract.singleSwap(1, params);
      await tx.wait();
      // 获取结果
      const wethBalanceAfter = await wethContract.balanceOf(signer.address);
      const usdcBalanceAfter = await usdcContract.balanceOf(signer.address);
      // 断言
      assert(
        wethBalanceBefore - wethBalanceAfter == params.amountIn,
        "wethBalanceBefore - wethBalanceAfter not equal to params.amountIn"
      );
      assert(
        usdcBalanceAfter - usdcBalanceBefore == amountOut,
        "usdcBalanceAfter - usdcBalanceBefore not equal to amountOut"
      );
    });
  });
});
