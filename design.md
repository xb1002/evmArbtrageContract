## 设计思路

### 初步设想

分三块，首先是封装好一个 SwapRouterSelf 用于执行兑换行为，这个 SwapRouterSelf 应该能够执行不同的 dex 间兑换，例如在 uniswapV3 上兑换`weth`到`dai`,再从 pankswap 将`dai`兑换为`weth`。让兑换发生在同一笔交易中。
其次是需要封装 arbitrage 合约，这个 arbitrage 合约应该包含对于闪电贷的支持，但这个套利合约并不实现对于套利机会的寻找，其只负责执行指定的用户交易。
最后是需要一个链下的程序用于计算套利机会，发现机会则调用 arbitrage 执行套利交易。

### 逐步分析

#### SwapRouterSelf 合约设计

对于 SwapRouterSelf 合约，可以按照 uniswapV3book 中的思路进行 multiPool 的 swap，在 uniswapV3 中 path 定义为 token0Address - fee - token1Address - fee - token2Address..., 对于涉及多个 dex 的 path 中，可以考虑在路径中添加一个 dexId，例如 token0Address - fee - dex0Id - token1Address - fee - dex1Id - token2Address...，然后通过使用不同 dex 的 singleSwap 进行 swap 交易

主要的结构以及函数需要有

```solidity
    //
```

考虑一个问题，合约中对于 dex 的支持是否要写死，还是需要有足够的灵活性？？？
考虑再引入一个可升级合约，这个可升级合约将执行具体的 singleSwap 交易。由于在执行交换时，不同的 dex 传入的参数可能会有差异，因此没办法统一参数，如果要在 SwapRouterSelf 中统一参数而不引入另一个合约用于执行 singleSwap，会导致增加交易所的支持时需要添加新的逻辑判断并部署 SwapRouterSelf 合约，而分别对于每一个交易所进行支持，swapRouetr 中出现大量 if 语句，这会使得 swapRouetr 越来越大，并且很复杂，这并不是我们想要的。
一个简单的执行路径：

```
    SwapRouterSelf.swap -> SwapRouterSelf.singleSwap -> SingleSwap.singleSwap
```

我们引入 SingleSwap 合约，其将完成 singleSwap 的具体实现。
考虑到不同的 dex 需要不同的参数输入，没办法统一参数，因此增加交易所的支持时需要添加新的逻辑判断，考虑这样实现

```solidity
    // SingleSwap.sol -> SingleSwap Contract

    error NotSwapRouterSelfAddress()

    struct Exchange {
        uint8 dexId;
        string name;
        address swapRouterAddress;
    }
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    address swapRouterSelfAddress;
    mapping(uint8 => Exchange) public exchanges;

    modifier OnlySwapRouterSelfAddress(){
        require(msg.sender == swapRouterSelfAddress, NotSwapRouterSelfAddress())
        _;
    }

    constructor(address _swapRouterSelfAddress){
        swapRouterSelfAddress = _swapRouterSelfAddress
    }

    function singleSwap(ExactInputSingleParams calldata params) public returns(uint256){
        // 具体执行逻辑
    }
```

然后需要在 SwapRouterSelf 合约中

```solidity
    // SwapRouterSelf.sol -> SwapRouterSelf Contract
    ...
    address singleSwapExecAddress;
    ...

    function updateSingleSwapExecAddress(address _singleSwapExecAddress) public {
        singleSwapExecAddress = _singleSwapExecAddress;
    }

    function singleSwap(ExactInputSingleParams calldata params) {
        singleSwapContract = ISingleSwap(singleSwapExecAddress);
        singleSwapContract.singleSwap(params);
    }
```

#### 闪电贷支持

完成 SwapRouter 合约的设计及其实现，需要考虑增加对于闪电贷的支持，

由于 FlashLoan 是先向 pool 调用 flash 函数，flash 函数将所借贷的代币转入 recipient，再进入 msg.sender 这个继承了 IUniswapV3FlashCallback 接口的这个合约调用 uniswapV3FlashCallback 函数，执行完 uniswapV3FlashCallback 再回到 flash 函数中检查所借出的代币连带手续费是否归还，如果检查不通过则回滚交易

因此想通过使用闪电贷并借出代币进行交换套利，其执行逻辑需要放在 uniswapV3FlashCallback 函数中
