// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ISingleSwap.sol";

interface ISwapRouter {
    struct Exchange {
        string name;
        uint8 dexId;
        address swapRouterAddress;
    }

    struct ExactInputSingleParamsContainDexId {
        uint8 dexId;
        ISingleSwap.ExactInputSingleParams params;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function updateSingleSwapExecAddress(
        address _singleSwapExecAddress
    ) external;

    function singleSwap(
        ExactInputSingleParamsContainDexId calldata params
    ) external returns (uint256);

    function swap(ExactInputParams memory params) external returns (uint256);

    function getSupportDexName()
        external
        view
        returns (string[] memory dexNames);
}
