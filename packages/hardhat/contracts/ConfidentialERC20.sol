// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {
    FHERC20ERC20WrapperUpgradeable
} from "fhenix-confidential-contracts/contracts/FHERC20/extensions/FHERC20ERC20WrapperUpgradeable.sol";
import { IFHERC20 } from "fhenix-confidential-contracts/contracts/interfaces/IFHERC20.sol";

/**
 * @dev Upgradeable confidential ERC-20 wrapper deployed by {RedactCore}.
 *
 * Wraps a standard ERC-20 token into a confidential {FHERC20} token.
 * Name is auto-generated as `"FHERC20 Confidential <underlyingName>"` and
 * symbol as `"e<underlyingSymbol>"`.
 *
 * Deployed behind a UUPS proxy; the owner (typically RedactCore) may authorize upgrades.
 */
contract ConfidentialERC20 is FHERC20ERC20WrapperUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    error InvalidUnderlying(address token);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(IERC20 erc20_) public initializer {
        if (_isFHERC20(address(erc20_))) revert InvalidUnderlying(address(erc20_));

        uint8 d = _cappedDecimals(address(erc20_));
        string memory underlyingName = IERC20Metadata(address(erc20_)).name();
        string memory underlyingSymbol = IERC20Metadata(address(erc20_)).symbol();

        __FHERC20_init(
            string.concat("FHERC20 Confidential ", underlyingName),
            string.concat("e", underlyingSymbol),
            d,
            ""
        );
        __FHERC20ERC20Wrapper_init(erc20_);
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _cappedDecimals(address token) private view returns (uint8) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeCall(IERC20Metadata.decimals, ()));
        uint8 d = (ok && data.length == 32) ? abi.decode(data, (uint8)) : 18;
        return d > 6 ? 6 : d;
    }

    function _isFHERC20(address token) private view returns (bool) {
        try IERC165(token).supportsInterface(type(IFHERC20).interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
