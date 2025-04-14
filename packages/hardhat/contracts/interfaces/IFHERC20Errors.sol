// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/draft-IERC6093.sol)
pragma solidity ^0.8.25;

import { IERC20Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

/**
 * @dev Standard FHERC-20 Errors
 * Interface of the https://eips.ethereum.org/EIPS/eip-6093[ERC-6093] custom errors for ERC-20 tokens.
 */
interface IFHERC20Errors is IERC20Errors {
    /**
     * @dev Indicates an incompatible function being called.
     * Prevents unintentional treatment of an FHERC20 as a cleartext ERC20
     */
    error FHERC20IncompatibleFunction();

    /**
     * @dev encTransferFrom `from` and `permit.owner` don't match
     * @param from encTransferFrom param.
     * @param permitOwner token owner included in FHERC20_EIP712_Permit struct.
     */
    error FHERC20EncTransferFromOwnerMismatch(address from, address permitOwner);

    /**
     * @dev encTransferFrom `to` and `permit.spender` don't match
     * @param to encTransferFrom param.
     * @param permitSpender token receiver included in FHERC20_EIP712_Permit struct.
     */
    error FHERC20EncTransferFromSpenderMismatch(address to, address permitSpender);

    /**
     * @dev encTransferFrom `value` greater than `permit.value_hash` dont match (permit doesn't match InEuint128)
     * @param inValueHash encTransferFrom param inValue.ctHash.
     * @param permitValueHash token amount hash included in FHERC20_EIP712_Permit struct.
     */
    error FHERC20EncTransferFromValueHashMismatch(uint256 inValueHash, uint256 permitValueHash);

    /**
     * @dev Permit deadline has expired.
     * @param deadline Expired deadline of the FHERC20_EIP712_Permit.
     */
    error ERC2612ExpiredSignature(uint256 deadline);

    /**
     * @dev Mismatched signature.
     * @param signer ECDSA recovered signer of the FHERC20_EIP712_Permit.
     * @param owner Owner passed in as part of the FHERC20_EIP712_Permit struct.
     */
    error ERC2612InvalidSigner(address signer, address owner);
}
