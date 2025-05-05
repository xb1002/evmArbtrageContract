// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./exchange/uniswapV3/ISwapRouterUniswapV3.sol";
import "./exchange/pancakeV3/ISwapRouterPancakeV3.sol";
import "./interface/ISingleSwap.sol";
import "./interface/IERC20.sol";
import "hardhat/console.sol";

contract SingleSwap is ISingleSwap {
    error UnknownDexId();

    uint8 private exchangesCount;
    mapping(uint8 => Exchange) private exchanges;

    constructor(
        address _uniswapV3RouterAddress,
        address _pancakeV3RouterAddress
    ) {
        exchangesCount = 2;
        exchanges[0] = Exchange({
            dexId: 0,
            name: "Uniswap V3",
            swapRouterAddress: _uniswapV3RouterAddress
        });
        exchanges[1] = Exchange({
            dexId: 1,
            name: "Pancake V3",
            swapRouterAddress: _pancakeV3RouterAddress
        });
    }

    function singleSwap(
        uint8 dexId,
        ExactInputSingleParams memory params
    ) external returns (uint256) {
        // 具体执行逻辑
        address tokenIn = params.tokenIn;
        uint256 amountOut;
        // 如果exchanges[dexId]不存在，报错
        require(
            exchanges[dexId].swapRouterAddress != address(0),
            UnknownDexId()
        );
        // 从调用合约中取出tokenIn
        IERC20(tokenIn).transferFrom(
            msg.sender,
            address(this),
            params.amountIn
        );
        // 对即将兑换的tokenIn进行授权
        IERC20(tokenIn).approve(
            exchanges[dexId].swapRouterAddress,
            params.amountIn
        );
        if (dexId == 0) {
            console.log("execute uniswap v3");
            ISwapRouterUniswapV3.UniswapV3ExactInputSingleParams
                memory exactInputSingleParams = getUniswapV3ExactInputSingleParams(
                    params
                );
            amountOut = ISwapRouterUniswapV3(exchanges[dexId].swapRouterAddress)
                .exactInputSingle(exactInputSingleParams);
        } else if (dexId == 1) {
            console.log("execute pancake v3");
            ISwapRouterPancakeV3.PancakeV3ExactInputSingleParams
                memory exactInputSingleParams = getPancakeV3ExactInputSingleParams(
                    params
                );
            amountOut = ISwapRouterPancakeV3(exchanges[dexId].swapRouterAddress)
                .exactInputSingle(exactInputSingleParams);
        } else {
            revert UnknownDexId();
        }
        return amountOut;
    }

    function getUniswapV3ExactInputSingleParams(
        ExactInputSingleParams memory params
    )
        private
        pure
        returns (ISwapRouterUniswapV3.UniswapV3ExactInputSingleParams memory)
    {
        return
            ISwapRouterUniswapV3.UniswapV3ExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: params.fee,
                recipient: params.recipient,
                deadline: params.deadline == 0
                    ? type(uint256).max
                    : params.deadline,
                amountIn: params.amountIn,
                amountOutMinimum: params.amountOutMinimum,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96
            });
    }

    function getPancakeV3ExactInputSingleParams(
        ExactInputSingleParams memory params
    )
        private
        pure
        returns (ISwapRouterPancakeV3.PancakeV3ExactInputSingleParams memory)
    {
        return
            ISwapRouterPancakeV3.PancakeV3ExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: params.fee,
                recipient: params.recipient,
                deadline: params.deadline == 0
                    ? type(uint256).max
                    : params.deadline,
                amountIn: params.amountIn,
                amountOutMinimum: params.amountOutMinimum,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96
            });
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
