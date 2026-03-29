// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC7984 } from "fhenix-confidential-contracts/contracts/ERC7984/ERC7984.sol";
import { ERC7984ERC20Wrapper } from "fhenix-confidential-contracts/contracts/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import { IERC7984 } from "fhenix-confidential-contracts/contracts/interfaces/IERC7984.sol";

/**
 * @dev Confidential ERC-20 wrapper deployed by {RedactCore}.
 *
 * Wraps a standard ERC-20 token into a confidential {ERC7984} token.
 * Name is auto-generated as `"ERC7984 Confidential <underlyingName>"` and
 * symbol as `"e<underlyingSymbol>"`.
 */
contract ConfidentialERC20 is ERC7984ERC20Wrapper, Ownable {
    error InvalidUnderlying(address token);

    constructor(
        IERC20 erc20_
    )
        ERC7984(
            string.concat("ERC7984 Confidential ", IERC20Metadata(address(erc20_)).name()),
            string.concat("e", IERC20Metadata(address(erc20_)).symbol()),
            _cappedDecimals(address(erc20_)),
            ""
        )
        ERC7984ERC20Wrapper(erc20_)
        Ownable(msg.sender)
    {
        if (_isERC7984(address(erc20_))) revert InvalidUnderlying(address(erc20_));
    }

    function _cappedDecimals(address token) private view returns (uint8) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeCall(IERC20Metadata.decimals, ()));
        uint8 d = (ok && data.length == 32) ? abi.decode(data, (uint8)) : 18;
        return d > 6 ? 6 : d;
    }

    function _isERC7984(address token) private view returns (bool) {
        try IERC165(token).supportsInterface(type(IERC7984).interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }
}
