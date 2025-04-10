// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.25;

import {IERC20, IERC20Metadata, ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IFHERC20, FHERC20} from "./FHERC20.sol";
import {euint128, FHE} from "@fhenixprotocol/cofhe-foundry-mocks/FHE.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ConfidentialClaim} from "./ConfidentialClaim.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ConfidentialERC20 is FHERC20, Ownable, ConfidentialClaim {
    using EnumerableSet for EnumerableSet.UintSet;
    using SafeERC20 for IERC20;

    IERC20 private immutable _erc20;
    string private _symbol;

    event EncryptedERC20(
        address indexed from,
        address indexed to,
        uint128 value
    );
    event DecryptedERC20(
        address indexed from,
        address indexed to,
        uint128 value
    );
    event ClaimedDecryptedERC20(
        address indexed from,
        address indexed to,
        uint128 value
    );
    event SymbolUpdated(string symbol);

    /**
     * @dev The erc20 token couldn't be wrapped.
     */
    error FHERC20InvalidErc20(address token);

    /**
     * @dev The recipient is the zero address.
     */
    error InvalidRecipient();

    constructor(
        IERC20 erc20_,
        string memory symbolOverride_
    )
        Ownable(msg.sender)
        FHERC20(
            string.concat(
                "Confidential ",
                IERC20Metadata(address(erc20_)).name()
            ),
            bytes(symbolOverride_).length == 0
                ? string.concat("e", IERC20Metadata(address(erc20_)).symbol())
                : symbolOverride_,
            IERC20Metadata(address(erc20_)).decimals()
        )
    {
        try IFHERC20(address(erc20_)).isFherc20() returns (bool isFherc20) {
            if (isFherc20) {
                revert FHERC20InvalidErc20(address(erc20_));
            }
        } catch {
            // Not an FHERC20, continue
        }

        _erc20 = erc20_;

        _symbol = bytes(symbolOverride_).length == 0
            ? string.concat("e", IERC20Metadata(address(erc20_)).symbol())
            : symbolOverride_;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function updateSymbol(string memory updatedSymbol) public onlyOwner {
        _symbol = updatedSymbol;
        emit SymbolUpdated(updatedSymbol);
    }

    /**
     * @dev Returns the address of the erc20 ERC-20 token that is being encrypted wrapped.
     */
    function erc20() public view returns (IERC20) {
        return _erc20;
    }

    function encrypt(address to, uint128 value) public {
        if (to == address(0)) revert InvalidRecipient();
        _erc20.safeTransferFrom(msg.sender, address(this), value);
        _mint(to, value);
        emit EncryptedERC20(msg.sender, to, value);
    }

    function decrypt(address to, uint128 value) public {
        if (to == address(0)) revert InvalidRecipient();
        euint128 burned = _burn(msg.sender, value);
        FHE.decrypt(burned);
        _createClaim(to, value, burned);
        emit DecryptedERC20(msg.sender, to, value);
    }

    /**
     * @notice Claim a decrypted amount of the underlying ERC20
     * @param ctHash The ctHash of the burned amount
     */
    function claimDecrypted(uint256 ctHash) public {
        Claim memory claim = _handleClaim(ctHash);

        // Send the ERC20 to the recipient
        _erc20.safeTransfer(claim.to, claim.decryptedAmount);
        emit ClaimedDecryptedERC20(msg.sender, claim.to, claim.decryptedAmount);
    }
}
