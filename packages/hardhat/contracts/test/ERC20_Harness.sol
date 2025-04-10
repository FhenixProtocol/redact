// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.25;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IWETH } from "../interfaces/IWETH.sol";

contract ERC20_Harness is ERC20 {
    uint8 _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address account, uint256 value) public {
        _mint(account, value);
    }

    function burn(address account, uint256 value) public {
        _burn(account, value);
    }
}

contract WETH_Harness is ERC20_Harness, IWETH {
    constructor() ERC20_Harness("Wrapped ETH", "wETH", 18) {}

    function withdraw(uint256 amount) public {
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }

    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }
}
