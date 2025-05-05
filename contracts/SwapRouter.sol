// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interface/ISwapRouter.sol";
import "./interface/ISingleSwap.sol";
import "./interface/IERC20.sol";
import "./lib/Path.sol";
import "./lib/TickMath.sol";
import "hardhat/console.sol";

contract SwapRouter is ISwapRouter {
    error NotOnwerAddress();
    error TooLittleReceived(uint256);

    //这里可以考虑创建一个exchange的结构体来存储exchange相关信息，再通过一个mapping实现dexId和exchange的映射
    // struct Exchange {
    //     string name;
    //     uint8 dexId;
    //     address swapRouterAddress;
    // }

    // struct ExactInputSingleParamsContainDexId {
    //     uint8 dexId;
    //     ISingleSwap.ExactInputSingleParams params;
    // }

    // struct ExactInputParams {
    //     bytes path;
    //     address recipient;
    //     uint256 deadline;
    //     uint256 amountIn;
    //     uint256 amountOutMinimum;
    // }

    using Path for bytes;

    address public owner;
    address private singleSwapExecAddress;
    uint8 private exchangesCount;
    mapping(uint8 => Exchange) public exchanges; //这是一个以dexId为key，exchange为value的mapping

    constructor(address _singleSwapExecAddress) {
        owner = msg.sender;
        singleSwapExecAddress = _singleSwapExecAddress;

        updateExchanges();
    }

    modifier OnlyOwner() {
        require(msg.sender == owner, NotOnwerAddress());
        _;
    }

    function updateExchanges() private {
        ISingleSwap.Exchange[] memory exchangesArray;
        ISingleSwap singleSwapContract = ISingleSwap(singleSwapExecAddress);
        (exchangesArray, exchangesCount) = singleSwapContract.getExchanges();
        for (uint8 i = 0; i < exchangesCount; i++) {
            exchanges[i] = Exchange({
                name: exchangesArray[i].name,
                dexId: exchangesArray[i].dexId,
                swapRouterAddress: exchangesArray[i].swapRouterAddress
            });
        }
    }

    function updateSingleSwapExecAddress(
        address _singleSwapExecAddress
    ) public OnlyOwner {
        singleSwapExecAddress = _singleSwapExecAddress;
        updateExchanges();
    }

    // 注意这里用到的singleSwap方法是exactInputSingle方法
    function singleSwap(
        ExactInputSingleParamsContainDexId memory params
    ) public returns (uint256 amount) {
        // 打印所有的params
        console.log("params.dexId", params.dexId);
        console.log("params.params.tokenIn", params.params.tokenIn);
        console.log("params.params.tokenOut", params.params.tokenOut);
        console.log("params.params.fee", params.params.fee);
        console.log("params.params.recipient", params.params.recipient);
        console.log("params.params.amountIn", params.params.amountIn);
        console.log(
            "params.params.amountOutMinimum",
            params.params.amountOutMinimum
        );
        console.log(
            "params.params.sqrtPriceLimitX96",
            params.params.sqrtPriceLimitX96
        );

        // 向singleSwapExecAddress授权
        IERC20(params.params.tokenIn).approve(
            singleSwapExecAddress,
            params.params.amountIn
        );
        ISingleSwap singleSwapContract = ISingleSwap(singleSwapExecAddress);
        amount = singleSwapContract.singleSwap(params.dexId, params.params);
    }

    // 这个_swap只接受一个池的交换，如果有多个池则抛出异常
    function _swap(ExactInputParams memory params) private returns (uint256) {
        require(
            params.path.hasMultiplePools() == false,
            "path contains multiple pools"
        );
        (address tokenIn, address tokenOut, uint24 fee, uint8 dexId) = params
            .path
            .decodeFirstPool();
        return
            singleSwap(
                ExactInputSingleParamsContainDexId({
                    dexId: dexId,
                    params: ISingleSwap.ExactInputSingleParams({
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        fee: fee,
                        recipient: params.recipient,
                        deadline: params.deadline,
                        amountIn: params.amountIn,
                        amountOutMinimum: params.amountOutMinimum,
                        sqrtPriceLimitX96: (tokenIn < tokenOut)
                            ? TickMath.MIN_SQRT_RATIO + 1
                            : TickMath.MAX_SQRT_RATIO - 1
                    })
                })
            );
    }

    // 这里参照uniswap的swap方法，将多个dex的参数封装成一个数组，然后循环调用singleSwap方法
    function swap(
        ExactInputParams memory params
    ) public returns (uint256 amountOut) {
        bool hasMultiplePools;
        // 向本合约转入tokenIn
        (address tokenIn, , , ) = params.path.decodeFirstPool();
        IERC20(tokenIn).transferFrom(
            msg.sender,
            address(this),
            params.amountIn
        );

        while (true) {
            hasMultiplePools = params.path.hasMultiplePools();

            params.amountIn = _swap(
                ExactInputParams({
                    path: params.path.getFirstPool(),
                    recipient: hasMultiplePools
                        ? address(this)
                        : params.recipient,
                    deadline: params.deadline,
                    amountIn: params.amountIn,
                    amountOutMinimum: params.amountOutMinimum
                })
            );
            // console.log("params.amountIn", params.amountIn);

            if (hasMultiplePools) {
                params.path = params.path.skipToken();
            } else {
                amountOut = params.amountIn;
                break;
            }
        }
        if (amountOut < params.amountOutMinimum)
            revert TooLittleReceived(amountOut);

        // 从本合约转出tokenOut
        // (, address tokenOut, , ) = params.path.decodeFirstPool();
        // IERC20(tokenOut).transfer(params.recipient, amountOut);

        return amountOut;
    }

    function getSupportDexName()
        public
        view
        returns (string[] memory dexNames)
    {
        dexNames = new string[](exchangesCount);
        for (uint8 i = 0; i < exchangesCount; i++) {
            dexNames[i] = exchanges[i].name;
        }
        return dexNames;
    }
}
