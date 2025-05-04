// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../exchange/uniswapV3/ISwapRouterUniswapV3.sol";
import "../exchange/pancakeV3/ISwapRouterPancakeV3.sol";

interface ISingleSwap {
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

    function singleSwap(
        uint8 dexId,
        ExactInputSingleParams calldata params
    ) external returns (uint256);

    function getExchanges() external view returns (Exchange[] memory, uint8);
}
