// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IUniswapV3Pool {
    struct Slot0 {
        uint160 sqrtPriceX96;
    }

    function slot0() external view returns (Slot0 memory);

    function factory() external view returns (address);

    function token0() external view returns (address);

    function token1() external view returns (address);

    function fee() external view returns (uint24);

    function liquidity() external view returns (uint256);
}
