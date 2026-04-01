// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { ConfidentialETH } from "../ConfidentialETH.sol";

/// @dev V2 mock used only to verify that UUPS upgrades work correctly in tests.
contract ConfidentialETHV2_Harness is ConfidentialETH {
    function version() public pure returns (uint256) {
        return 2;
    }
}
