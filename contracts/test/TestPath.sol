// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/Path.sol";
import "hardhat/console.sol";

contract TestPath {
    using Path for bytes;

    address public constant weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant usdt = 0xdAC17F958D2ee523a2206206994597C13D831ec7;

    uint24 public constant fee0 = 60;
    uint24 public constant fee1 = 10;

    uint8 public constant dexId0 = 0;
    uint8 public constant dexId1 = 1;

    constructor() {}

    function exc() public pure {
        bytes memory res = bytes.concat(
            bytes20(weth),
            bytes3(fee0),
            bytes1(dexId0),
            bytes20(usdc),
            bytes3(fee1),
            bytes1(dexId1),
            bytes20(usdt)
        );
        console.logBytes(res);
        (address tokenIn, address tokenOut, uint24 fee, uint8 dexId) = Path
            .decodeFirstPool(res);
        console.log(tokenIn);
        console.log(tokenOut);
        console.log(fee);
        console.log(dexId);
    }
}
