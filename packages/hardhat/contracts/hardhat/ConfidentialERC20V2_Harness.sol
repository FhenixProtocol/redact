// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { ConfidentialERC20 } from "../ConfidentialERC20.sol";

/// @dev V2 mock used only to verify that UUPS upgrades work correctly in tests.
contract ConfidentialERC20V2_Harness is ConfidentialERC20 {
    function version() public pure returns (uint256) {
        return 2;
    }
}
