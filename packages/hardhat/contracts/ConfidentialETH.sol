// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {
    FHERC20NativeWrapperUpgradeable,
    IWETH
} from "fhenix-confidential-contracts/contracts/FHERC20/extensions/FHERC20NativeWrapperUpgradeable.sol";

/**
 * @dev Upgradeable confidential native-token wrapper registered with {RedactCore}.
 *
 * Wraps native ETH (or any WETH-compatible asset) into a confidential {FHERC20} token.
 * Name is fixed as `"FHERC20 Confidential Ether"` and symbol as `"eETH"`.
 *
 * Deployed behind a UUPS proxy; the owner (typically RedactCore) may authorize upgrades.
 */
contract ConfidentialETH is FHERC20NativeWrapperUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(IWETH weth_) public initializer {
        uint8 d = _cappedDecimals(address(weth_));
        __FHERC20_init("FHERC20 Confidential Ether", "eETH", d, "");
        __FHERC20NativeWrapper_init(weth_);
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _cappedDecimals(address token) private view returns (uint8) {
        // Use a low-level staticcall so that non-standard WETH implementations
        // that revert or omit decimals() do not brick initialization.
        // Falls back to 18 (the ERC-20 default) on failure, matching the
        // behaviour of ConfidentialERC20._cappedDecimals.
        (bool ok, bytes memory data) = token.staticcall(abi.encodeCall(IERC20Metadata.decimals, ()));
        uint8 d = (ok && data.length == 32) ? abi.decode(data, (uint8)) : 18;
        return d > 6 ? 6 : d;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
