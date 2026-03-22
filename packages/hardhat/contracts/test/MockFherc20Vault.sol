// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import { FHE, InEuint64, euint64 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { IFHERC20 } from "fhenix-confidential-contracts/contracts/interfaces/IFHERC20.sol";

contract MockFherc20Vault {
    IFHERC20 public fherc20;

    constructor(address fherc20_) {
        fherc20 = IFHERC20(fherc20_);
    }

    function deposit(InEuint64 memory inValue) public {
        euint64 value = FHE.asEuint64(inValue);
        FHE.allow(value, address(fherc20));
        fherc20.confidentialTransferFrom(msg.sender, address(this), value);
    }
}
