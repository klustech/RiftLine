// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Riftline Token (RFT)
/// @notice Governance/payment token with EIP-2612 permit & ERC20Votes.
contract RiftlineToken is ERC20, ERC20Permit, ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address admin)
        ERC20("Riftline Token", "RFT")
        ERC20Permit("Riftline Token")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        // optional: initial mint for treasury bootstrap
        // _mint(admin, 100_000_000e18);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    // --- hooks for Votes ---
    function _update(address from, address to, uint256 amount)
        internal override(ERC20, ERC20Votes)
    {
        super._update(from, to, amount);
    }

    function nonces(address owner)
        public view
        override(ERC20Permit)
        returns (uint256)
    { return super.nonces(owner); }
}
