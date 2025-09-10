// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {PropertyNFT} from "./PropertyNFT.sol";
import {Errors} from "../errors/Errors.sol";

/// @title PropertyVault
/// @notice Holds property ownership; only Manager can move NFTs (normally never).
contract PropertyVault is AccessControl {
    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
    }

    function rescue(PropertyNFT nft, uint256 tokenId, address to) external onlyRole(MANAGER_ROLE) {
        // Emergency-only: move the underlying if needed.
        nft.transferFrom(address(this), to, tokenId);
    }
}
