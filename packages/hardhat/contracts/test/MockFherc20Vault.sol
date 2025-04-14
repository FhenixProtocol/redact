// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.25;

import { ConfidentialERC20 } from "../ConfidentialERC20.sol";
import { ConfidentialETH } from "../ConfidentialETH.sol";
import { IWETH } from "../interfaces/IWETH.sol";
import { InEuint128 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { IFHERC20 } from "../interfaces/IFHERC20.sol";

contract MockFherc20Vault {
    IFHERC20 public fherc20;

    constructor(address fherc20_) {
        fherc20 = IFHERC20(fherc20_);
    }

    function deposit(InEuint128 memory inValue, IFHERC20.FHERC20_EIP712_Permit calldata permit) public {
        fherc20.encTransferFrom(msg.sender, address(this), inValue, permit);
    }
}
