import { ethers } from "hardhat";
import {
  PoolInfo,
  Token,
  Path,
  PathWithFunc,
  Pool,
  PoolHash,
} from "./lib/type";
import * as Matrix from "./lib/matrix";

export class PoolMap {
  public maxTokenNumber: number; //最大token数量
  public poolMap: Matrix.Matrix3D<Pool>; // 记录tokenIn与tokenOut之间的所有池子
  public poolIdMap: Map<PoolHash, number> = new Map(); // 记录每个Pool的在poolMap[i][j]中的id
  public amountOut: Matrix.Matrix3D<number>; // 记录每个池中tokenIn进入会有多少tokenOut
  public tokenIdMap: Map<string, number> = new Map(); //tokenAddress->poolMap中的tokenId
  public tokenAddressMap: Map<number, string> = new Map(); //tokenId->tokenAddress
  public maxAmountOutMap: Matrix.Matrix2D<number>; // 记录每个在tokenIn->tokenOut的池子中，最大的amountOut
  public maxAmountOutPoolIdMap: Matrix.Matrix2D<number>; // 记录每个在tokenIn->tokenOut的池子中，最大的amountOut的池子id

  constructor(amount: number = 100) {
    this.maxTokenNumber = amount;
    this.poolMap = Matrix.create3DMatrix(amount);
    this.amountOut = Matrix.create3DMatrix(amount);
    this.maxAmountOutPoolIdMap = Matrix.create2DMatrix(amount);
    // 将0作为maxAmountOutMap的初始值，并将对角线元素设置为1
    this.maxAmountOutMap = Array.from({ length: amount }, () =>
      Array.from({ length: amount }, () => 0)
    );
    this.maxAmountOutMap = this.setDiagonalTo1(this.maxAmountOutMap);
  }

  // 设置二维矩阵对角线为1
  public setDiagonalTo1(
    matrix: Matrix.Matrix2D<number>
  ): Matrix.Matrix2D<number> {
    for (let i = 0; i < matrix.length; i++) {
      matrix[i][i] = 1;
    }
    return matrix;
  }

  // 获取数组中最大值及其索引
  public getMaxValueAndIndex(arr: number[]): [number, number] {
    let max = -Infinity;
    let index = -1;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > max) {
        max = arr[i];
        index = i;
      }
    }
    return [max, index];
  }

  // 向poolMap中添加一个pool
  public addPool(pool: Pool) {
    const [token0, token1, fee] = [
      pool.token0.address,
      pool.token1.address,
      pool.fee,
    ];
    // 如果token0和token1不在poolMap中，就添加
    if (!this.tokenIdMap.has(token0)) {
      this.tokenAddressMap.set(this.tokenIdMap.size, token0);
      this.tokenIdMap.set(token0, this.tokenIdMap.size);
    }
    if (!this.tokenIdMap.has(token1)) {
      this.tokenAddressMap.set(this.tokenIdMap.size, token1);
      this.tokenIdMap.set(token1, this.tokenIdMap.size);
    }
    // 获取tokenId
    const [token0Id, token1Id] = [
      this.tokenIdMap.get(token0)!,
      this.tokenIdMap.get(token1)!,
    ];
    const poolId = this.poolMap[token0Id][token1Id].length;
    this.poolIdMap.set(pool.getPoolHash(), poolId);
    this.poolMap[token0Id][token1Id].push(pool);
    this.poolMap[token1Id][token0Id].push(pool);
  }

  public updateAmountOut(pool: Pool, tokenIn: string, amountOut: number) {
    const [tokenInId, tokenOutId] =
      tokenIn == pool.token0.address
        ? [
            this.tokenIdMap.get(pool.token0.address)!,
            this.tokenIdMap.get(pool.token1.address)!,
          ]
        : [
            this.tokenIdMap.get(pool.token1.address)!,
            this.tokenIdMap.get(pool.token0.address)!,
          ];
    const poolId = this.poolIdMap.get(pool.getPoolHash())!;
    this.amountOut[tokenInId][tokenOutId][poolId] = amountOut;
    const [maxAmountOut, maxAmountOutPoolId] = this.getMaxValueAndIndex(
      this.amountOut[tokenInId][tokenOutId]
    );
    this.maxAmountOutMap[tokenInId][tokenOutId] = maxAmountOut;
    this.maxAmountOutPoolIdMap[tokenInId][tokenOutId] = maxAmountOutPoolId;
  }

  // 初始化maxAmountOutPath,这是从tokenIn到tokenOut的最大amountOut路径
  public initMaxAmountOutPath(): Matrix.Matrix2D<PathWithFunc> {
    let maxAmountOutPath: Matrix.Matrix2D<PathWithFunc> = Matrix.create2DMatrix(
      this.maxTokenNumber
    );
    for (let i = 0; i < this.maxTokenNumber; i++) {
      for (let j = 0; j < this.maxTokenNumber; j++) {
        maxAmountOutPath[i][j] = new PathWithFunc(this.tokenAddressMap.get(i)!);
        if (i !== j) {
          maxAmountOutPath[i][j].addPath(
            this.tokenAddressMap.get(j)!,
            this.poolMap[i][j][this.maxAmountOutPoolIdMap[i][j]].fee,
            this.poolMap[i][j][this.maxAmountOutPoolIdMap[i][j]].dexId
          );
        }
      }
    }
    return maxAmountOutPath;
  }

  // 深拷贝，用于保存副本
  public copy(variable: any): any {
    return JSON.parse(JSON.stringify(variable));
  }

  // 这里检查path是否在mainPath中，用于避免出现重复路径
  public checkPathUesd(path: Path, mainPath: Path): boolean {
    if (mainPath.length === 0) return false;
    let startEqualIndex = -1;
    for (let i = 0; i < mainPath.length; i = i + 3) {
      if (mainPath[i] === path[0]) {
        startEqualIndex = i;
      }
    }
    if (startEqualIndex === -1) return false;
    for (let i = 0; i < path.length; i++) {
      if (mainPath[startEqualIndex + i] !== path[i]) {
        return false;
      }
    }
    return true;
  }

  //
  public getMaxAmountOutByIter(iterationNumber: number) {
    let maxAmountOutPath: Matrix.Matrix2D<PathWithFunc> =
      this.initMaxAmountOutPath();
    let maxAmountOutPathCopy: Matrix.Matrix2D<PathWithFunc> =
      this.initMaxAmountOutPath();
    let maxAmountOutInitPath: Matrix.Matrix2D<PathWithFunc> =
      this.initMaxAmountOutPath();
    let maxAmountOutMap = this.copy(this.maxAmountOutMap);
    let maxAmountOutMapCopy: Matrix.Matrix2D<number>;
    let maxAmountOutInitMapTranspose: Matrix.Matrix2D<number> =
      Matrix.transpose(this.copy(maxAmountOutMap));
    for (let n = 0; n < iterationNumber; n++) {
      maxAmountOutMapCopy = this.copy(maxAmountOutMap);
      for (let i = 0; i < this.maxTokenNumber; i++) {
        for (let j = 0; j < this.maxTokenNumber; j++) {
          const [maxAmountOut, maxAmountOutPoolColumnId] =
            this.getMaxValueAndIndex(
              Matrix.vectorMultiply(
                maxAmountOutMapCopy[i],
                maxAmountOutInitMapTranspose[j]
              )
            );
          if (maxAmountOut > maxAmountOutMapCopy[i][j]) {
            // 检查该maxAmountOutInitPath[maxAmountOutPoolColumnId][j]是否是单路径
            if (
              !maxAmountOutInitPath[maxAmountOutPoolColumnId][
                j
              ].checkSinglePath()
            ) {
              throw new Error(
                "maxAmountOutInitPath[maxAmountOutPoolColumnId][j]不是单个路径"
              );
            }
            if (
              maxAmountOutPathCopy[i][j].getPoolNum() > 0 &&
              this.checkPathUesd(
                maxAmountOutInitPath[maxAmountOutPoolColumnId][j].path,
                maxAmountOutPathCopy[i][j].path
              )
            ) {
              continue;
            }
            maxAmountOutPath[i][j].path = maxAmountOutPathCopy[i][
              maxAmountOutPoolColumnId
            ].addPathWithoutChange(
              maxAmountOutInitPath[maxAmountOutPoolColumnId][j]
                .path[3] as string, //tokenOut
              maxAmountOutInitPath[maxAmountOutPoolColumnId][j]
                .path[1] as number, //fee
              maxAmountOutInitPath[maxAmountOutPoolColumnId][j]
                .path[2] as number //dexId
            );
          }
          maxAmountOutMap[i][j] = maxAmountOut;
        }
      }
      maxAmountOutMapCopy = this.copy(maxAmountOutMap);
      maxAmountOutPathCopy = maxAmountOutPath;
    }
    return [maxAmountOutMap, maxAmountOutPath];
  }
}

function testPoolMapClass() {
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
  const pool1: Pool = new Pool(weth, usdc, 100, 0);
  const pool2: Pool = new Pool(weth, wbtc, 100, 0);
  const pool3: Pool = new Pool(weth, usdc, 500, 1);
  const pool4: Pool = new Pool(wbtc, usdc, 500, 1);

  const poolMap = new PoolMap(3);

  poolMap.addPool(pool1);
  poolMap.addPool(pool2);
  poolMap.addPool(pool3);
  poolMap.addPool(pool4);
  // 更新maxAmountOut
  poolMap.updateAmountOut(pool1, weth.address, 1800);
  poolMap.updateAmountOut(pool1, usdc.address, 1 / 1800);
  poolMap.updateAmountOut(pool2, weth.address, 0.02);
  poolMap.updateAmountOut(pool2, wbtc.address, 1 / 0.02);
  poolMap.updateAmountOut(pool3, weth.address, 1700);
  poolMap.updateAmountOut(pool3, usdc.address, 1 / 1700);
  poolMap.updateAmountOut(pool4, wbtc.address, 95000);
  poolMap.updateAmountOut(pool4, usdc.address, 1 / 95000);

  console.log(poolMap.maxAmountOutMap);

  const [amountOut, path] = poolMap.getMaxAmountOutByIter(5);

  console.log(amountOut);
  console.log(path[2]);
}

// test
// testPoolMapClass();
