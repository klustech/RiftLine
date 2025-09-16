// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ServerRegistry} from "./ServerRegistry.sol";

contract Item1155 is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ERC1155Upgradeable {
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    ServerRegistry public registry;

    mapping(uint256 => uint256) public weaponStats;
    mapping(uint256 => uint256) public templatePrice;
    mapping(uint256 => bytes32) public kindOf;

    function initialize(address admin, ServerRegistry r, string memory uri_) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ERC1155_init(uri_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        registry = r;
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function _encode(
        uint16 dmg,
        uint16 rof,
        uint16 rangeM,
        uint16 acc,
        uint16 recoil,
        uint16 mag,
        uint16 reloadCS,
        uint8 tier,
        uint8 flags
    ) public pure returns (uint256 p) {
        p = uint256(dmg);
        p |= uint256(rof) << 16;
        p |= uint256(rangeM) << 32;
        p |= uint256(acc) << 48;
        p |= uint256(recoil) << 64;
        p |= uint256(mag) << 80;
        p |= uint256(reloadCS) << 96;
        p |= uint256(tier) << 112;
        p |= uint256(flags) << 120;
    }

    function defineWeaponTemplate(uint256 templateId, bytes32 kindKey, uint256 packedStats, uint256 priceRFT)
        external
        onlyRole(ADMIN_ROLE)
    {
        weaponStats[templateId] = packedStats;
        templatePrice[templateId] = priceRFT;
        kindOf[templateId] = kindKey;
    }

    function mintWeapon(address to, uint32 serverId, uint256 templateId, uint256 amount) external onlyRole(MINTER_ROLE) {
        bytes32 kind = kindOf[templateId];
        require(kind != 0, "unknown template");
        registry.assertCanMint(serverId, kind, amount);
        uint256 tokenId = (uint256(serverId) << 224) | templateId;
        _mint(to, tokenId, amount, "");
        registry.bumpMinted(serverId, kind, amount);
    }

    function supportsInterface(bytes4 iid)
        public
        view
        override(AccessControlUpgradeable, ERC1155Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(iid);
    }

    uint256[45] private __gap;
}
