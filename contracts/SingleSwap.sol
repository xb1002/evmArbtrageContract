// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SingleSwap {
    error NotSwapRouterAddress();

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

    address private swapRouterAddress;
    uint8 private exchangesCount;
    mapping(uint8 => Exchange) private exchanges;

    constructor(address _swapRouterAddress) {
        swapRouterAddress = _swapRouterAddress;
    }

    modifier OnlySwapRouterSelfAddress() {
        require(msg.sender == swapRouterAddress, NotSwapRouterAddress());
        _;
    }

    function singleSwap(
        uint8 dexId,
        ExactInputSingleParams calldata params
    ) public returns (uint256) {
        // 具体执行逻辑
    }

    function getExchanges() public view returns (Exchange[] memory, uint8) {
        // 返回 exchanges
        Exchange[] memory allExchanges = new Exchange[](exchangesCount);
        for (uint8 i = 0; i < exchangesCount; i++) {
            allExchanges[i] = exchanges[i];
        }
        return (allExchanges, exchangesCount);
    }
}
