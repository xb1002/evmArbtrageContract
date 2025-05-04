// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interface/IERC20.sol";

interface IWETH is IERC20 {
    function deposit() external payable;

    function withdraw(uint256 amount) external;

    function totalSupply() external view returns (uint256);

    function balanceOf(address _address) external view returns (uint256);
}
