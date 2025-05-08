// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interface/IGetHelper.sol";
import "../exchange/uniswapV3/IUniswapV3Pool.sol";
import "../interface/IERC20.sol";

interface IERC20_Extend is IERC20 {
    function decimals() external view returns (uint8);

    function symbol() external view returns (string memory);

    function name() external view returns (string memory);
}

contract GetHelper is IGetHelper {
    constructor() {}

    function getSlot1(
        address poolPairAddress
    ) external view override returns (IGetHelper.Slot1 memory slot1) {
        IUniswapV3Pool pool = IUniswapV3Pool(poolPairAddress);
        slot1.sqrtPriceX96 = pool.slot0().sqrtPriceX96;
        slot1.liquidity = pool.liquidity();
        (address _token0, address _token1) = pool.token0() < pool.token1()
            ? (pool.token0(), pool.token1())
            : (pool.token1(), pool.token0());
        IERC20_Extend token0 = IERC20_Extend(_token0);
        IERC20_Extend token1 = IERC20_Extend(_token1);
        slot1.reserve0 = token0.balanceOf(poolPairAddress);
        slot1.reserve1 = token1.balanceOf(poolPairAddress);
        slot1.factory = pool.factory();
        slot1.fee = pool.fee();
        slot1.token0 = Token(
            _token0,
            token0.decimals(),
            token0.symbol(),
            token0.name()
        );
        slot1.token1 = Token(
            _token1,
            token1.decimals(),
            token1.symbol(),
            token1.name()
        );
    }

    function getSlot2(
        address poolPairAddress
    ) external view override returns (IGetHelper.Slot2 memory slot2) {
        IUniswapV3Pool pool = IUniswapV3Pool(poolPairAddress);
        slot2.reserve0 = IERC20(pool.token0()).balanceOf(poolPairAddress);
        slot2.reserve1 = IERC20(pool.token1()).balanceOf(poolPairAddress);
        slot2.sqrtPriceX96 = pool.slot0().sqrtPriceX96;
        slot2.liquidity = pool.liquidity();
    }
}
