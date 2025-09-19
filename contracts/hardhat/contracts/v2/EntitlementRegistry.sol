// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title EntitlementRegistry
/// @notice Tracks role entitlements for on-chain/off-chain authorization bridges.
contract EntitlementRegistry is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    mapping(address => mapping(bytes32 => uint64)) private _entitlementExpiry;

    event EntitlementGranted(address indexed account, bytes32 indexed entitlement, uint64 expiry);
    event EntitlementRevoked(address indexed account, bytes32 indexed entitlement);

    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function setIssuer(address issuer, bool allowed) external onlyRole(ADMIN_ROLE) {
        if (allowed) {
            _grantRole(ISSUER_ROLE, issuer);
        } else {
            _revokeRole(ISSUER_ROLE, issuer);
        }
    }

    function grantEntitlement(address account, bytes32 entitlement, uint64 expiry) external onlyRole(ISSUER_ROLE) {
        require(account != address(0), "account zero");
        uint64 normalized = expiry;
        if (normalized == 0) {
            normalized = type(uint64).max;
        }
        _entitlementExpiry[account][entitlement] = normalized;
        emit EntitlementGranted(account, entitlement, normalized);
    }

    function revokeEntitlement(address account, bytes32 entitlement) external onlyRole(ISSUER_ROLE) {
        delete _entitlementExpiry[account][entitlement];
        emit EntitlementRevoked(account, entitlement);
    }

    function hasEntitlement(address account, bytes32 entitlement) public view returns (bool) {
        uint64 expiry = _entitlementExpiry[account][entitlement];
        if (expiry == 0) {
            return false;
        }
        if (expiry == type(uint64).max) {
            return true;
        }
        return expiry > block.timestamp;
    }

    function entitlementExpiry(address account, bytes32 entitlement) external view returns (uint64) {
        return _entitlementExpiry[account][entitlement];
    }

    uint256[47] private __gap;
}
