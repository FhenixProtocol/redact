// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.25;

import { IERC20, IERC20Metadata, ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { EnumerableMap } from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import { Ownable, Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { ConfidentialERC20 } from "./ConfidentialERC20.sol";
import { ConfidentialETH } from "./ConfidentialETH.sol";
import { IWETH } from "./interfaces/IWETH.sol";

contract RedactCore is Ownable2Step {
    using EnumerableMap for EnumerableMap.AddressToAddressMap;

    EnumerableMap.AddressToAddressMap private _fherc20Map;

    // Confidential ETH :: ETH / wETH deposited into Redacted are routed to eETH
    IWETH public immutable wETH;
    ConfidentialETH public immutable eETH;

    // Stablecoins :: deposited stablecoins are routed to FUSD
    mapping(address erc20 => bool isStablecoin) public _stablecoins;

    constructor(IWETH wETH_, ConfidentialETH eETH_) Ownable(msg.sender) {
        if (address(wETH_) == address(0)) revert Invalid_WETH();
        if (address(eETH_) == address(0)) revert Invalid_eETH();
        wETH = wETH_;
        eETH = eETH_;
        _fherc20Map.set(address(wETH), address(eETH));
    }

    event Fherc20Deployed(address indexed erc20, address indexed fherc20);
    event StablecoinUpdated(address indexed erc20, bool isStablecoin);
    event Fherc20SymbolUpdated(address indexed fherc20, string symbol);

    error Invalid_AlreadyDeployed();
    error Invalid_Stablecoin();
    error Invalid_WETH();
    error Invalid_eETH();

    function updateStablecoin(address stablecoin, bool isStablecoin) public onlyOwner {
        _stablecoins[stablecoin] = isStablecoin;
        emit StablecoinUpdated(stablecoin, isStablecoin);
    }

    function getFherc20(address erc20) public view returns (address) {
        (bool exists, address fherc20) = _fherc20Map.tryGet(erc20);
        if (!exists) return address(0);
        return fherc20;
    }

    function getIsStablecoin(address erc20) public view returns (bool) {
        return _stablecoins[erc20];
    }

    function getIsWETH(address erc20) public view returns (bool) {
        return erc20 == address(wETH);
    }

    function updateFherc20Symbol(ConfidentialERC20 fherc20, string memory updatedSymbol) public onlyOwner {
        fherc20.updateSymbol(updatedSymbol);
        emit Fherc20SymbolUpdated(address(fherc20), updatedSymbol);
    }

    function deployFherc20(IERC20 erc20) public {
        if (_fherc20Map.contains(address(erc20))) revert Invalid_AlreadyDeployed();

        if (_stablecoins[address(erc20)]) revert Invalid_Stablecoin();
        if (address(erc20) == address(wETH)) revert Invalid_WETH();

        ConfidentialERC20 fherc20 = new ConfidentialERC20(erc20, "");
        _fherc20Map.set(address(erc20), address(fherc20));

        emit Fherc20Deployed(address(erc20), address(fherc20));
    }

    struct MappedERC20 {
        address erc20;
        address fherc20;
    }

    function getDeployedFherc20s() public view returns (MappedERC20[] memory mappedFherc20s) {
        mappedFherc20s = new MappedERC20[](_fherc20Map.length());

        address _mapErc20;
        address _mapFherc20;

        for (uint256 i = 0; i < _fherc20Map.length(); i++) {
            (_mapErc20, _mapFherc20) = _fherc20Map.at(i);
            mappedFherc20s[i] = MappedERC20(_mapErc20, _mapFherc20);
        }
    }
}
