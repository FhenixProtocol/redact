// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { EnumerableMap } from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import { ConfidentialERC20 } from "./ConfidentialERC20.sol";
import { ConfidentialETH } from "./ConfidentialETH.sol";
import { IWETH } from "fhenix-confidential-contracts/contracts/interfaces/IWETH.sol";

/**
 * @dev Core registry and factory for the Redact protocol.
 *
 * Manages a mapping of ERC-20 tokens to their confidential {ConfidentialERC20} wrappers.
 * A pre-deployed {ConfidentialETH} instance is registered at construction time for the
 * chain's native token (via WETH).
 *
 * Anyone may call {deployConfidentialERC20} to permissionlessly create a confidential wrapper
 * for a supported ERC-20. Each deployed wrapper is owned by this contract.
 */
contract RedactCore is Ownable2Step {
    using EnumerableMap for EnumerableMap.AddressToAddressMap;

    EnumerableMap.AddressToAddressMap private _confidentialERC20Map;

    IWETH public immutable wETH;
    ConfidentialETH public immutable eETH;

    event ConfidentialERC20Deployed(address indexed erc20, address indexed confidentialERC20);

    error AlreadyDeployed();
    error InvalidWETH();
    error InvalideETH();

    constructor(IWETH wETH_, ConfidentialETH eETH_) Ownable(msg.sender) {
        if (address(wETH_) == address(0)) revert InvalidWETH();
        if (address(eETH_) == address(0)) revert InvalideETH();
        wETH = wETH_;
        eETH = eETH_;
        _confidentialERC20Map.set(address(wETH), address(eETH));
    }

    /**
     * @dev Deploys a new {ConfidentialERC20} wrapper for `erc20` and registers it.
     * Reverts if a wrapper already exists or if `erc20` is WETH (use {eETH} instead).
     */
    function deployConfidentialERC20(IERC20 erc20) public returns (ConfidentialERC20) {
        if (address(erc20) == address(wETH)) revert InvalidWETH();
        if (_confidentialERC20Map.contains(address(erc20))) revert AlreadyDeployed();

        ConfidentialERC20 confidentialERC20 = new ConfidentialERC20(erc20);
        _confidentialERC20Map.set(address(erc20), address(confidentialERC20));

        emit ConfidentialERC20Deployed(address(erc20), address(confidentialERC20));
        return confidentialERC20;
    }

    /**
     * @dev Returns the confidential wrapper address for `erc20`, or `address(0)` if none exists.
     */
    function getConfidentialERC20(address erc20) public view returns (address) {
        (bool exists, address confidential) = _confidentialERC20Map.tryGet(erc20);
        return exists ? confidential : address(0);
    }

    struct MappedERC20 {
        address erc20;
        address confidentialERC20;
    }

    /**
     * @dev Returns all registered ERC-20 → ConfidentialERC20 pairs.
     */
    function getDeployedConfidentialERC20s() public view returns (MappedERC20[] memory mapped) {
        uint256 len = _confidentialERC20Map.length();
        mapped = new MappedERC20[](len);

        for (uint256 i = 0; i < len; i++) {
            (address erc20, address confidential) = _confidentialERC20Map.at(i);
            mapped[i] = MappedERC20(erc20, confidential);
        }
    }
}
