export type Token = {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
};

export type Factory = {
  address: string;
  initCodeHash: string;
};

export class PoolInfo {
  public token0: string;
  public token1: string;
  public fee: number;
  public dexId: number;

  constructor(token0: string, token1: string, fee: number, dexId: number) {
    // 对token0和token1进行排序,先将16进制转换为小数,然后进行比较
    [this.token0, this.token1] =
      BigInt(token0) < BigInt(token1) ? [token0, token1] : [token1, token0];
    this.fee = fee;
    this.dexId = dexId;
  }
}

function testPoolInfo() {
  let token0 = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  let token1 = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  let fee = 500;
  let poolInfo1 = new PoolInfo(token0, token1, fee, 0);
  let poolInfo2 = new PoolInfo(token1, token0, fee, 0);
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
