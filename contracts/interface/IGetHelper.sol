// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGetHelper {
    struct Token {
        address tokenAddress;
        uint8 decimals;
        string symbol;
        string name;
    }
    struct Slot1 {
        address factory;
        Token token0;
        Token token1;
        uint256 reserve0;
        uint256 reserve1;
        uint160 sqrtPriceX96;
        uint256 liquidity;
        uint24 fee;
    }
    struct Slot2 {
        uint256 reserve0;
        uint256 reserve1;
        uint160 sqrtPriceX96;
        uint256 liquidity;
    }

    function getSlot1(
        address poolPairAddress
    ) external view returns (Slot1 memory);

    function getSlot2(
        address poolPairAddress
    ) external view returns (Slot2 memory);
}
