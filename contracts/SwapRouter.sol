// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interface/ISwapRouter.sol";
import "./interface/ISingleSwap.sol";
import "./interface/IERC20.sol";
import "hardhat/console.sol";

contract SwapRouter is ISwapRouter {
    error NotOnwerAddress();

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
        ExactInputSingleParamsContainDexId calldata params
    ) public {
        // 需要从转入tokenIn
        IERC20(params.params.tokenIn).transferFrom(
            msg.sender,
            address(this),
            params.params.amountIn
        );
        // 向singleSwapExecAddress授权
        IERC20(params.params.tokenIn).approve(
            singleSwapExecAddress,
            params.params.amountIn
        );
        ISingleSwap singleSwapContract = ISingleSwap(singleSwapExecAddress);
        singleSwapContract.singleSwap(params.dexId, params.params);
    }

    // 这里参照uniswap的swap方法，将多个dex的参数封装成一个数组，然后循环调用singleSwap方法
    function swap() public returns (uint256 amount) {}

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
