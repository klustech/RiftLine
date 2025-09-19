// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {EntitlementRegistry} from "./EntitlementRegistry.sol";

/// @title CitizenPassport
/// @notice Soulbound identity NFT issued per player wallet with optional entitlement hooks.
contract CitizenPassport is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ERC721Upgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct Passport {
        bytes32 cityId;
        bytes32 metadataHash;
    }

    EntitlementRegistry public entitlementRegistry;
    string private _base;
    uint256 public totalIssued;

    mapping(uint256 => Passport) public passportOf;
    mapping(address => uint256) public passportIdOf;

    event PassportIssued(uint256 indexed tokenId, address indexed account, bytes32 indexed cityId, bytes32 metadataHash);
    event PassportRevoked(uint256 indexed tokenId, address indexed account);
    event PassportMetadataUpdated(uint256 indexed tokenId, bytes32 metadataHash);
    event EntitlementRegistryUpdated(address indexed registry);

    function initialize(address admin, string calldata baseURI) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ERC721_init("Rift Citizen Passport", "RCP");
        _base = baseURI;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function setEntitlementRegistry(EntitlementRegistry registry) external onlyRole(ADMIN_ROLE) {
        entitlementRegistry = registry;
        emit EntitlementRegistryUpdated(address(registry));
    }

    function setBaseURI(string calldata newBase) external onlyRole(ADMIN_ROLE) {
        _base = newBase;
    }

    function issue(address to, bytes32 cityId, bytes32 metadataHash) external onlyRole(ISSUER_ROLE) returns (uint256 tokenId) {
        require(passportIdOf[to] == 0, "passport exists");
        tokenId = ++totalIssued;
        passportOf[tokenId] = Passport({cityId: cityId, metadataHash: metadataHash});
        passportIdOf[to] = tokenId;
        _safeMint(to, tokenId);
        _syncEntitlement(to, tokenId, metadataHash, true);
        emit PassportIssued(tokenId, to, cityId, metadataHash);
    }

    function revoke(address account) external onlyRole(ISSUER_ROLE) {
        uint256 tokenId = passportIdOf[account];
        require(tokenId != 0, "no passport");
        delete passportIdOf[account];
        _syncEntitlement(account, tokenId, passportOf[tokenId].metadataHash, false);
        delete passportOf[tokenId];
        _burn(tokenId);
        emit PassportRevoked(tokenId, account);
    }

    function updateMetadata(uint256 tokenId, bytes32 metadataHash) external onlyRole(ISSUER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "invalid token");
        passportOf[tokenId].metadataHash = metadataHash;
        emit PassportMetadataUpdated(tokenId, metadataHash);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "invalid token");
        return string(abi.encodePacked(_base, Strings.toString(tokenId)));
    }

    function entitlementId(bytes32 cityId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("CITY_CITIZEN", cityId));
    }

    function _syncEntitlement(address account, uint256 tokenId, bytes32 metadataHash, bool grant) internal {
        account;
        metadataHash;
        if (address(entitlementRegistry) == address(0)) {
            return;
        }
        bytes32 cityEntitlement = entitlementId(passportOf[tokenId].cityId);
        if (grant) {
            entitlementRegistry.grantEntitlement(_ownerOf(tokenId), cityEntitlement, 0);
        } else {
            entitlementRegistry.revokeEntitlement(account, cityEntitlement);
        }
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            revert("non-transferable");
        }
        if (from != address(0)) {
            passportIdOf[from] = 0;
        }
        if (to != address(0)) {
            passportIdOf[to] = tokenId;
        }
        return from;
    }

    function supportsInterface(bytes4 iid)
        public
        view
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(iid);
    }

    uint256[45] private __gap;
}
