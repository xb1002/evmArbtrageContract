// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.7.5;
pragma abicoder v2;

import "./IPancakeV3SwapCallback.sol";

/// @title Router token swapping functionality
/// @notice Functions for swapping tokens via PancakeSwap V3
interface ISwapRouterPancakeV3 is IPancakeV3SwapCallback {
    struct PancakeV3ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another token
    /// @dev Setting `amountIn` to 0 will cause the contract to look up its own balance,
    /// and swap the entire amount, enabling contracts to send tokens before calling this function.
    /// @param params The parameters necessary for the swap, encoded as `ExactInputSingleParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInputSingle(
        PancakeV3ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
}
