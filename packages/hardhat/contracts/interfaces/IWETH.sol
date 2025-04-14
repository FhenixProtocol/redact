// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IWETH is IERC20 {
    function withdraw(uint256 amount) external;
    function deposit() external payable;
}
