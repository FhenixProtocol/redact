// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import { IERC20, IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { FHERC20 } from "./FHERC20.sol";
import { IWETH } from "./interfaces/IWETH.sol";
import { euint128, FHE } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { ConfidentialClaim } from "./ConfidentialClaim.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ConfidentialETH is FHERC20, Ownable, ConfidentialClaim {
    using EnumerableSet for EnumerableSet.UintSet;
    using SafeERC20 for IERC20;
    using SafeERC20 for IWETH;

    IWETH public wETH;

    constructor(
        IWETH wETH_
    ) Ownable(msg.sender) FHERC20("Confidential Wrapped ETHER", "eETH", IERC20Metadata(address(wETH_)).decimals()) {
        wETH = wETH_;
    }

    /**
     * @dev Returns the address of the erc20 ERC-20 token that is being encrypted wrapped.
     */
    function erc20() public view returns (IERC20) {
        return wETH;
    }

    receive() external payable {}

    fallback() external payable {}

    event EncryptedWETH(address indexed from, address indexed to, uint128 value);
    event EncryptedETH(address indexed from, address indexed to, uint256 value);
    event DecryptedETH(address indexed from, address indexed to, uint128 value);
    event ClaimedDecryptedETH(address indexed from, address indexed to, uint128 value);

    /**
     * @dev The ETH transfer failed.
     */
    error ETHTransferFailed();

    /**
     * @dev The recipient is the zero address.
     */
    error InvalidRecipient();

    function encryptWETH(address to, uint128 value) public {
        if (to == address(0)) to = msg.sender;
        wETH.safeTransferFrom(msg.sender, address(this), value);
        wETH.withdraw(value);
        _mint(to, value);
        emit EncryptedWETH(msg.sender, to, value);
    }

    function encryptETH(address to) public payable {
        if (to == address(0)) to = msg.sender;
        _mint(to, SafeCast.toUint128(msg.value));
        emit EncryptedETH(msg.sender, to, msg.value);
    }

    function decrypt(address to, uint128 value) public {
        if (to == address(0)) to = msg.sender;
        euint128 burned = _burn(msg.sender, value);
        FHE.decrypt(burned);
        _createClaim(to, value, burned);
        emit DecryptedETH(msg.sender, to, value);
    }

    /**
     * @notice Claim a decrypted amount of ETH
     * @param ctHash The ctHash of the burned amount
     */
    function claimDecrypted(uint256 ctHash) public {
        Claim memory claim = _handleClaim(ctHash);

        // Send the ETH to the recipient
        (bool sent, ) = claim.to.call{ value: claim.decryptedAmount }("");
        if (!sent) revert ETHTransferFailed();

        emit ClaimedDecryptedETH(msg.sender, claim.to, claim.decryptedAmount);
    }

    /**
     * @notice Claim all decrypted amounts of ETH
     */
    function claimAllDecrypted() public {
        Claim[] memory claims = _handleClaimAll();

        for (uint256 i = 0; i < claims.length; i++) {
            (bool sent, ) = claims[i].to.call{ value: claims[i].decryptedAmount }("");
            if (!sent) revert ETHTransferFailed();
            emit ClaimedDecryptedETH(msg.sender, claims[i].to, claims[i].decryptedAmount);
        }
    }
}
