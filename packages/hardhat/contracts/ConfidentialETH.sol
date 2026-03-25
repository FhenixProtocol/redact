// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC7984 } from "fhenix-confidential-contracts/contracts/ERC7984/ERC7984.sol";
import {
    ERC7984NativeWrapper,
    IWETH
} from "fhenix-confidential-contracts/contracts/ERC7984/extensions/ERC7984NativeWrapper.sol";

/**
 * @dev Confidential native-token wrapper deployed externally and registered with {RedactCore}.
 *
 * Wraps native ETH (or any WETH-compatible asset) into a confidential {ERC7984} token.
 * Name is fixed as `"ERC7984 Confidential Ether"` and symbol as `"eETH"`.
 */
contract ConfidentialETH is ERC7984NativeWrapper, Ownable {
    constructor(
        IWETH weth_
    )
        ERC7984("ERC7984 Confidential Ether", "eETH", _cappedDecimals(address(weth_)), "")
        ERC7984NativeWrapper(weth_)
        Ownable(msg.sender)
    {}

    function _cappedDecimals(address token) private view returns (uint8) {
        uint8 d = IERC20Metadata(token).decimals();
        return d > 6 ? 6 : d;
    }
}
