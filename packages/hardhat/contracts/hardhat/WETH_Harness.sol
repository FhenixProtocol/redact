// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IWETH } from "fhenix-confidential-contracts/contracts/interfaces/IWETH.sol";

/// @dev Minimal WETH test harness implementing the IWETH interface.
contract WETH_Harness is ERC20, IWETH {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() external payable override {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external override {
        _burn(msg.sender, amount);
        (bool ok, ) = msg.sender.call{ value: amount }("");
        require(ok, "WETH_Harness: ETH transfer failed");
    }

    receive() external payable {
        _mint(msg.sender, msg.value);
    }
}
