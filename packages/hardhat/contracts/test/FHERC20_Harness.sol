// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.25;

import { FHERC20 } from "../FHERC20.sol";

contract FHERC20_Harness is FHERC20 {
    constructor(string memory name_, string memory symbol_, uint8 decimals_) FHERC20(name_, symbol_, decimals_) {}

    function mint(address account, uint128 value) public {
        _mint(account, value);
    }

    function burn(address account, uint128 value) public {
        _burn(account, value);
    }

    function setUserIndicatedBalance(address account, uint16 value) public {
        _indicatedBalances[account] = value;
    }

    function setTotalIndicatedSupply(uint16 value) public {
        _indicatedTotalSupply = value;
    }
}
