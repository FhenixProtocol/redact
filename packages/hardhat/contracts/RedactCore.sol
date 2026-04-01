// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { EnumerableMap } from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import { ConfidentialERC20 } from "./ConfidentialERC20.sol";
import { ConfidentialETH } from "./ConfidentialETH.sol";
import { IWETH } from "fhenix-confidential-contracts/contracts/interfaces/IWETH.sol";

/**
 * @dev Core registry and factory for the Redact protocol.
 *
 * Manages a mapping of ERC-20 tokens to their confidential {ConfidentialERC20} UUPS proxies.
 * A pre-deployed {ConfidentialETH} proxy is registered at construction time for the
 * chain's native token (via WETH).
 *
 * Anyone may call {deployConfidentialERC20} to permissionlessly create a confidential wrapper
 * proxy for a supported ERC-20. Each deployed proxy's owner is this contract, enabling
 * the RedactCore owner to upgrade all wrappers via {upgradeWrapper}.
 */
contract RedactCore is Ownable2Step {
    using EnumerableMap for EnumerableMap.AddressToAddressMap;

    EnumerableMap.AddressToAddressMap private _confidentialERC20Map;

    IWETH public immutable wETH;
    ConfidentialETH public immutable eETH;
    address public confidentialERC20Implementation;

    event ConfidentialERC20Deployed(address indexed erc20, address indexed confidentialERC20);
    event ConfidentialERC20ImplementationUpdated(address indexed oldImpl, address indexed newImpl);

    error AlreadyDeployed();
    error InvalidWETH();
    error InvalidEETH();
    error InvalidImplementation();

    constructor(
        IWETH wETH_,
        ConfidentialETH eETH_,
        address confidentialERC20Implementation_
    ) Ownable(msg.sender) {
        if (address(wETH_) == address(0)) revert InvalidWETH();
        if (address(eETH_) == address(0)) revert InvalidEETH();
        if (confidentialERC20Implementation_ == address(0)) revert InvalidImplementation();

        wETH = wETH_;
        eETH = eETH_;
        confidentialERC20Implementation = confidentialERC20Implementation_;
        _confidentialERC20Map.set(address(wETH_), address(eETH_));
    }

    // =========================================================================
    //  Views
    // =========================================================================

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

    // =========================================================================
    //  Factory
    // =========================================================================

    /**
     * @dev Deploys a new {ConfidentialERC20} UUPS proxy for `erc20` and registers it.
     * Reverts if a wrapper already exists or if `erc20` is WETH (use {eETH} instead).
     */
    function deployConfidentialERC20(IERC20 erc20) public returns (address) {
        if (address(erc20) == address(wETH)) revert InvalidWETH();
        if (_confidentialERC20Map.contains(address(erc20))) revert AlreadyDeployed();

        bytes memory initData = abi.encodeCall(ConfidentialERC20.initialize, (erc20));
        ERC1967Proxy proxy = new ERC1967Proxy(confidentialERC20Implementation, initData);

        _confidentialERC20Map.set(address(erc20), address(proxy));

        emit ConfidentialERC20Deployed(address(erc20), address(proxy));
        return address(proxy);
    }

    // =========================================================================
    //  Upgrade management
    // =========================================================================

    /**
     * @dev Updates the shared ConfidentialERC20 implementation used for future deployments.
     * Does not affect already-deployed proxies — use {upgradeWrapper} for those.
     */
    function setConfidentialERC20Implementation(address newImplementation) external onlyOwner {
        if (newImplementation == address(0)) revert InvalidImplementation();
        address old = confidentialERC20Implementation;
        confidentialERC20Implementation = newImplementation;
        emit ConfidentialERC20ImplementationUpdated(old, newImplementation);
    }

    /**
     * @dev Upgrades a registered ConfidentialERC20 or ConfidentialETH proxy to a new implementation.
     * Only callable by the RedactCore owner. The proxy must be owned by this contract.
     */
    function upgradeWrapper(address proxy, address newImplementation, bytes calldata data) external onlyOwner {
        UUPSUpgradeable(proxy).upgradeToAndCall(newImplementation, data);
    }
}
