// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.25;

import "./FHERC20Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

interface IFUSDVault {
    function redeem(address to, uint128 amount) external;
}

contract FUSD is FHERC20Upgradeable, AccessControlUpgradeable {
    using EnumerableSet for EnumerableSet.UintSet;

    error CallerNotMinter(address caller);
    error CallerNotAdmin(address caller);
    error InvalidFUSDVault();
    error InvalidRecipient();
    error ClaimNotFound();
    error AlreadyClaimed();

    event MintedFUSD(
        address indexed caller,
        address indexed to,
        uint128 amount
    );
    event RedeemedFUSD(
        address indexed caller,
        address indexed to,
        uint128 amount
    );
    event ClaimedRedeemedFUSD(
        address indexed caller,
        address indexed to,
        uint128 amount
    );
    event FUSDVaultUpdated(
        address indexed caller,
        address indexed newFUSDVault
    );

    struct Claim {
        uint256 ctHash;
        uint128 requestedAmount;
        uint128 decryptedAmount;
        bool decrypted;
        address to;
        bool claimed;
    }

    struct FUSDStorage {
        // The address of the vault that holds the underlying stablecoin assets
        // Also handles minting and redeeming of FUSD
        address fusdVault;
        // Mapping of ctHash to claim
        mapping(uint256 ctHash => Claim) claims;
        // Mapping of user to a set of ctHashes (each representing a claim)
        mapping(address => EnumerableSet.UintSet) userClaims;
    }

    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // bytes32 private constant FUSDStorageLocation =
    //     keccak256(
    //         abi.encode(uint256(keccak256("fhenix.storage.FUSD")) - 1)
    //     ) & ~bytes32(uint256(0xff));
    bytes32 private constant FUSDStorageLocation =
        0xe50f9a2817db0d2f949d224eb43b71bea5efba5616570a0f831be3f359f46000;

    function _getFUSDStorage() private pure returns (FUSDStorage storage $) {
        assembly {
            $.slot := FUSDStorageLocation
        }
    }

    function initialize(address fusdVault_) public initializer {
        __FHERC20_init("FHE US Dollar", "FUSD", 6);

        FUSDStorage storage $ = _getFUSDStorage();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        $.fusdVault = fusdVault_;
        _grantRole(MINTER_ROLE, fusdVault_);
    }

    /**
     *  @dev Modifier that reverts if the caller is not an admin
     */
    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender))
            revert CallerNotAdmin(msg.sender);
        _;
    }

    /**
     *  @dev Modifier that reverts if the caller is not a minter
     */
    modifier onlyMinter() {
        if (!hasRole(MINTER_ROLE, msg.sender))
            revert CallerNotMinter(msg.sender);
        _;
    }

    /**
     * @dev Function that should revert when `msg.sender` is not authorized to upgrade the contract. Called by
     * {upgradeTo} and {upgradeToAndCall}.
     *
     * Implement this to add upgrade authorization mechanisms.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyAdmin {}

    // VAULT FUNCTIONS

    function mint(address to, uint128 amount) external onlyMinter {
        if (to == address(0)) revert InvalidRecipient();

        _mint(to, amount);

        emit MintedFUSD(msg.sender, to, amount);
    }

    function redeem(address to, uint128 amount) external {
        if (to == address(0)) revert InvalidRecipient();

        euint128 burned = _burn(msg.sender, amount);
        FHE.decrypt(burned);
        _createClaim(to, amount, burned);

        emit RedeemedFUSD(msg.sender, to, amount);
    }

    function claimRedeemed(uint256 ctHash) external {
        FUSDStorage storage $ = _getFUSDStorage();
        Claim memory claim = _handleClaim(ctHash);

        // Call the vault with the redeemed amount
        IFUSDVault($.fusdVault).redeem(claim.to, claim.decryptedAmount);

        emit ClaimedRedeemedFUSD(msg.sender, claim.to, claim.decryptedAmount);
    }

    // ADMIN FUNCTIONS

    function updateFUSDVault(address fusdVault_) external onlyAdmin {
        if (fusdVault_ == address(0)) revert InvalidFUSDVault();

        FUSDStorage storage $ = _getFUSDStorage();

        // Revoke the old minter role
        _revokeRole(MINTER_ROLE, $.fusdVault);

        // Update the vault address and grant the new minter role
        $.fusdVault = fusdVault_;
        _grantRole(MINTER_ROLE, fusdVault_);

        emit FUSDVaultUpdated(msg.sender, fusdVault_);
    }

    // CLAIM FUNCTIONS

    function _createClaim(
        address to,
        uint128 value,
        euint128 claimable
    ) internal {
        FUSDStorage storage $ = _getFUSDStorage();

        $.claims[euint128.unwrap(claimable)] = Claim({
            ctHash: euint128.unwrap(claimable),
            requestedAmount: value,
            decryptedAmount: 0,
            decrypted: false,
            to: to,
            claimed: false
        });

        $.userClaims[to].add(euint128.unwrap(claimable));
    }

    function _handleClaim(
        uint256 ctHash
    ) internal returns (Claim memory claim) {
        FUSDStorage storage $ = _getFUSDStorage();
        claim = $.claims[ctHash];

        // Check that the claimable amount exists and has not been claimed yet
        if (claim.to == address(0)) revert ClaimNotFound();
        if (claim.claimed) revert AlreadyClaimed();

        // Get the decrypted amount (reverts if the amount is not decrypted yet)
        uint128 amount = SafeCast.toUint128(FHE.getDecryptResult(ctHash));

        // Update the claim
        claim.decryptedAmount = amount;
        claim.decrypted = true;
        claim.claimed = true;

        // Update the claim in storage
        $.claims[ctHash] = claim;

        // Remove the claimable amount from the user's claimable set
        $.userClaims[claim.to].remove(ctHash);
    }

    function getClaim(uint256 ctHash) public view returns (Claim memory) {
        FUSDStorage storage $ = _getFUSDStorage();
        Claim memory _claim = $.claims[ctHash];

        (uint256 amount, bool decrypted) = FHE.getDecryptResultSafe(ctHash);

        _claim.decryptedAmount = SafeCast.toUint128(amount);
        _claim.decrypted = decrypted;

        return _claim;
    }

    function getUserClaims(address user) public view returns (Claim[] memory) {
        FUSDStorage storage $ = _getFUSDStorage();
        uint256[] memory ctHashes = $.userClaims[user].values();

        Claim[] memory userClaims = new Claim[](ctHashes.length);
        for (uint256 i = 0; i < ctHashes.length; i++) {
            userClaims[i] = $.claims[ctHashes[i]];
        }

        return userClaims;
    }
}
