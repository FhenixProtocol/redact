//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Import FHE.sol library
import "@fhenixprotocol/cofhe-contracts/FHE.sol";

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

contract FHEContract {
    euint32 public val;

    constructor() {
        val = FHE.asEuint32(0);
    }

    function setVal(InEuint32 memory _inVal) public {
        val = FHE.asEuint32(_inVal);
        FHE.allowSender(val);
        FHE.allowThis(val);
    }

    function valOp(uint8 op, InEuint32 memory _operand) public {
        euint32 operand = FHE.asEuint32(_operand);
        if (op == 0) {
            val = FHE.add(val, operand);
        } else if (op == 1) {
            val = FHE.sub(val, operand);
        } else if (op == 2) {
            val = FHE.mul(val, operand);
        } else if (op == 3) {
            val = FHE.div(val, operand);
        }
        FHE.allowSender(val);
        FHE.allowThis(val);
    }
}
