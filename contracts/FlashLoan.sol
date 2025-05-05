// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./exchange/uniswapV3/IUniswapV3FlashCallback.sol";
import "./interface/IERC20.sol";
import "./interface/ISwapRouter.sol";
import "./lib/Path.sol";
import "./interface/IFlashLoan.sol";
import "hardhat/console.sol";

interface IUniswapV3Factory {
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}

interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}

contract FlashLoan is IUniswapV3FlashCallback, IFlashLoan {
    using Path for bytes;

    address owner;
    address uniswapV3FactoryAddress;
    address swapRouterAddress;

    constructor(address _uniswapV3FactoryAddress, address _swapRouterAddress) {
        uniswapV3FactoryAddress = _uniswapV3FactoryAddress;
        swapRouterAddress = _swapRouterAddress;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not authorized");
        _;
    }

    // 外部只需要确保token0和token1与amount0和amount1是对应的即可，并不需要排序
    function flashLoan(
        uint256 _amount0,
        uint256 _amount1,
        PoolInfo calldata poolInfo,
        ISwapRouter.ExactInputParams calldata params
    ) external onlyOwner {
        // 只能借入一种币
        require(
            (_amount0 == 0) != (_amount1 == 0),
            "invalid amount, only can borrow one token"
        );
        (uint256 amount0, uint256 amount1) = poolInfo.token0 < poolInfo.token1
            ? (_amount0, _amount1)
            : (_amount1, _amount0);
        (address token0, address token1) = poolInfo.token0 < poolInfo.token1
            ? (poolInfo.token0, poolInfo.token1)
            : (poolInfo.token1, poolInfo.token0);
        address pool = IUniswapV3Factory(uniswapV3FactoryAddress).getPool(
            token0,
            token1,
            uint24(poolInfo.fee)
        );
        // if pool is zero, revert
        require(pool != address(0), InvalidPoolInfo());
        IUniswapV3Pool(pool).flash(
            address(this),
            amount0,
            amount1,
            abi.encode(
                FalshCallbackData({
                    pool: pool,
                    amount0: amount0,
                    amount1: amount1,
                    token0: token0,
                    token1: token1,
                    params: params
                })
            )
        );
    }

    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FalshCallbackData memory flashCallbackData = abi.decode(
            data,
            (FalshCallbackData)
        );
        require(msg.sender == flashCallbackData.pool, "not authorized");

        // 执行套利交易
        // 检查TokenIn与borrow的Token是否相同
        (
            address _tokenIn,
            uint256 amountBrrowed,
            uint256 fee
        ) = (flashCallbackData.amount0 > 0)
                ? (flashCallbackData.token0, flashCallbackData.amount0, fee0)
                : (flashCallbackData.token1, flashCallbackData.amount1, fee1);
        (address tokenIn, , , ) = flashCallbackData
            .params
            .path
            .decodeFirstPool();
        require(tokenIn == _tokenIn, "tokenIn don't equal borrow token");
        // 执行套利交易
        // 向swapRouterAddress授权
        IERC20(tokenIn).approve(
            swapRouterAddress,
            flashCallbackData.params.amountIn
        );
        ISwapRouter.ExactInputParams memory params = ISwapRouter
            .ExactInputParams({
                path: flashCallbackData.params.path,
                recipient: address(this),
                deadline: flashCallbackData.params.deadline,
                amountIn: flashCallbackData.params.amountIn,
                amountOutMinimum: flashCallbackData.params.amountOutMinimum
            });
        uint256 amountOut = ISwapRouter(swapRouterAddress).swap(params);

        console.log("amountOut", amountOut);
        console.log("amountRepay", amountBrrowed + fee);

        // 归还借贷的Token
        uint256 amountRepay = amountBrrowed + fee;
        if (amountOut > amountRepay) {
            IERC20(tokenIn).transfer(flashCallbackData.pool, amountRepay);
            IERC20(tokenIn).transfer(
                flashCallbackData.params.recipient,
                amountOut - amountRepay
            );
        } else {
            revert NoProfit();
        }
    }

    function collect(address token) external onlyOwner {
        IERC20(token).transfer(
            msg.sender,
            IERC20(token).balanceOf(address(this))
        );
    }
}
