// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {EntitlementRegistry} from "./EntitlementRegistry.sol";

/// @title RoleBadge
/// @notice Soulbound ERC1155 badges that optionally synchronize with the entitlement registry.
contract RoleBadge is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ERC1155Upgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    EntitlementRegistry public entitlementRegistry;
    mapping(uint256 => bytes32) public entitlementForBadge;

    event BadgeDefined(uint256 indexed badgeId, bytes32 entitlementId);
    event EntitlementRegistryUpdated(address indexed registry);

    function initialize(address admin, string calldata uri_) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ERC1155_init(uri_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function setEntitlementRegistry(EntitlementRegistry registry) external onlyRole(ADMIN_ROLE) {
        entitlementRegistry = registry;
        emit EntitlementRegistryUpdated(address(registry));
    }

    function defineBadge(uint256 badgeId, bytes32 entitlementId) external onlyRole(ADMIN_ROLE) {
        entitlementForBadge[badgeId] = entitlementId;
        emit BadgeDefined(badgeId, entitlementId);
    }

    function issue(address to, uint256 badgeId, uint64 expiry) external onlyRole(ISSUER_ROLE) {
        require(to != address(0), "zero addr");
        require(entitlementForBadge[badgeId] != bytes32(0), "badge undefined");
        _mint(to, badgeId, 1, "");
        _syncEntitlement(to, badgeId, expiry, true);
    }

    function revoke(address from, uint256 badgeId) external onlyRole(ISSUER_ROLE) {
        _burn(from, badgeId, 1);
        _syncEntitlement(from, badgeId, 0, false);
    }

    function _syncEntitlement(address account, uint256 badgeId, uint64 expiry, bool grant) internal {
        if (address(entitlementRegistry) == address(0)) {
            return;
        }
        bytes32 entitlementId = entitlementForBadge[badgeId];
        if (entitlementId == bytes32(0)) {
            return;
        }
        if (grant) {
            entitlementRegistry.grantEntitlement(account, entitlementId, expiry);
        } else {
            entitlementRegistry.revokeEntitlement(account, entitlementId);
        }
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155Upgradeable)
    {
        super._update(from, to, ids, values);
        if (from != address(0) && to != address(0)) {
            revert("non-transferable");
        }
    }

    function supportsInterface(bytes4 iid)
        public
        view
        override(AccessControlUpgradeable, ERC1155Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(iid);
    }

    uint256[46] private __gap;
}
