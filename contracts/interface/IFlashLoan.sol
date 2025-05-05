// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ISwapRouter.sol";

interface IFlashLoan {
    error InvalidPoolInfo();
    error NoProfit();

    struct PoolInfo {
        address token0;
        address token1;
        uint256 fee;
    }

    struct FalshCallbackData {
        address pool;
        uint256 amount0;
        uint256 amount1;
        address token0;
        address token1;
        ISwapRouter.ExactInputParams params;
    }

    function flashLoan(
        uint256 _amount0,
        uint256 _amount1,
        PoolInfo calldata poolInfo,
        ISwapRouter.ExactInputParams calldata params
    ) external;

    // function uniswapV3FlashCallback(
    //     uint256 fee0,
    //     uint256 fee1,
    //     bytes calldata data
    // ) external;

    function collect(address token) external;
}
