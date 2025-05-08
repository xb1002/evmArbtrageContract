import { ethers } from "ethers";
import { valueTokens } from "./valueTokens";
import { calPoolAddress } from "./getPoolAddress";
export type Token = {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  price?: number;
};

export type Factory = {
  address: string;
  initCodeHash: string;
};

export class PoolInfo {
  public pairAddress: string;
  public token0: Token;
  public token1: Token;
  public fee: number;
  public dexId: number;

  constructor(token0: Token, token1: Token, fee: number, dexId: number) {
    // 对token0和token1进行排序,先将16进制转换为小数,然后进行比较
    [this.token0, this.token1] =
      BigInt(token0.address) < BigInt(token1.address)
        ? [token0, token1]
        : [token1, token0];
    this.fee = fee;
    this.dexId = dexId;
    this.pairAddress = calPoolAddress(
      this.token0.address,
      this.token1.address,
      this.fee,
      this.dexId
    );
  }
}

export type PoolHash = string;
// 这是自定义的Slot2类型
export interface Slot2 {
  liquidity: number;
  sqrtPriceX96: number;
  reserve0: number;
  reserve1: number;
}
export class Pool extends PoolInfo {
  public liquidity: number = 0;
  public sqrtPriceX96: number = 0;
  public reserve0: number = 0; //记录这个池子的Reserve0
  public reserve1: number = 0; //记录这个池子的Reserve1
  public totalTvl: number = 0; //记录这个池子的总TVL

  public getPoolHash(): PoolHash {
    return ethers.keccak256(
      ethers.toUtf8Bytes(
        this.token0.address + this.token1.address + this.fee + this.dexId
      )
    );
  }
  public getAmountOut(tokenIn: Token, amountIn: number): number {
    let amountOut = 0;
    let sqrtPriceX96 = Number(this.sqrtPriceX96) / 2 ** 96;
    let liquidity = Number(this.liquidity);
    const tokenOut =
      this.token0.address === tokenIn.address ? this.token1 : this.token0;
    const zeroForOne = this.token0.address === tokenIn.address;
    amountIn = amountIn * 10 ** tokenIn.decimals;
    if (liquidity === 0) return amountOut;
    if (zeroForOne) {
      const sqrtPriceX96Target =
        (sqrtPriceX96 * liquidity) / (amountIn * sqrtPriceX96 + liquidity);
      amountOut = liquidity * (sqrtPriceX96Target - sqrtPriceX96);
    } else {
      const sqrtPriceX96Target = amountIn / liquidity + sqrtPriceX96;
      amountOut = (1 / sqrtPriceX96Target - 1 / sqrtPriceX96) * liquidity;
    }
    const slippage = zeroForOne
      ? (amountOut / Number(this.reserve1)) ** 2
      : (amountOut / Number(this.reserve0)) ** 2;
    return (
      Math.abs(amountOut / 10 ** tokenOut.decimals) *
      (1 - slippage) *
      (1 - Number(this.fee) / 10 ** 6)
    );
  }
  public updateSlot2(Slot2: Slot2) {
    // 这里考虑监听事件实时更新liquidity和sqrtPriceX96,一旦更新，
    // 就直接计算amountOut并向PoolMap中发送更新amount的请求
    [this.liquidity, this.sqrtPriceX96, this.reserve0, this.reserve1] = [
      Slot2.liquidity,
      Slot2.sqrtPriceX96,
      Slot2.reserve0,
      Slot2.reserve1,
    ];
  }
  // 注意，该函数要求token0和token1都有价格
  private _calTvl() {
    if (this.token0.price && this.token1.price) {
      return (
        (this.token0.price / 10 ** this.token0.decimals) *
          Number(this.reserve0) +
        (this.token1.price / 10 ** this.token1.decimals) * Number(this.reserve1)
      );
    } else {
      throw new Error("token0 or token1 price not found");
    }
  }
  public updateTvl() {
    // 查看是否有价格，如果有价格，就计算tvl
    if (!this.token0.price && !this.token1.price) {
      return 0;
    }
    if (this.token0.price && this.token1.price) {
      this.totalTvl = this._calTvl();
      return this.totalTvl;
    }
    if (this.token0.price) {
      let token0InAmount =
        Math.floor(Number(this.reserve0) / 10 ** this.token0.decimals) * 0.01;
      let token1OutAmount = this.getAmountOut(this.token0, token0InAmount);
      if (token1OutAmount === 0) return 0;
      this.token1.price =
        (token0InAmount / token1OutAmount) * this.token0.price;
      this.totalTvl = this._calTvl();
      return this.totalTvl;
    }
    if (this.token1.price) {
      let token1InAmount =
        Math.floor(Number(this.reserve1) / 10 ** this.token1.decimals) * 0.01;
      let token0OutAmount = this.getAmountOut(this.token1, token1InAmount);
      if (token0OutAmount === 0) return 0;
      this.token0.price =
        (token1InAmount / token0OutAmount) * this.token1.price;
      this.totalTvl = this._calTvl();
      return this.totalTvl;
    }
  }
  // 这里从valueTokens中更新token的价格
  public updatePrice() {
    // 从valueTokens中更新
    let token0 = valueTokens.find(
      (token) => token.address === this.token0.address
    );
    if (token0) {
      this.token0.price = token0.price;
    }
    let token1 = valueTokens.find(
      (token) => token.address === this.token1.address
    );
    if (token1) {
      this.token1.price = token1.price;
    }
  }
}

export type Path = Array<string | number>;
export class PathWithFunc {
  public path: Path = [];
  constructor(tokenIn: string) {
    this.path.push(tokenIn);
  }
  public addPathWithoutChange(
    tokenOut: string,
    fee: number,
    dexId: number
  ): Path {
    return this.path.concat([fee, dexId, tokenOut]);
  }
  public addPath(tokenOut: string, fee: number, dexId: number) {
    this.path.push(fee, dexId, tokenOut);
  }
  public getPoolNum(): number {
    return (this.path.length - 1) / 3;
  }
  public checkSinglePath() {
    if (this.path.length === 4) {
      return true;
    }
    return false;
  }
}

function testPoolInfo() {
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

  let fee = 500;
  let poolInfo1 = new PoolInfo(weth, usdc, fee, 0);
  let poolInfo2 = new PoolInfo(usdc, weth, fee, 0);
  // poolInfo1和poolInfo2是相等的
  if (
    poolInfo1.token0 === poolInfo2.token0 &&
    poolInfo1.token1 === poolInfo2.token1
  ) {
    console.log("testPoolInfo pass: poolInfo1和poolInfo2是相等的");
  } else {
    throw new Error("testPoolInfo fail:poolInfo1和poolInfo2不相等");
  }
}

// test
// testPoolInfo();
