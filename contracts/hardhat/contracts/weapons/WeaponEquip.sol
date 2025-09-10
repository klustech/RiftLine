// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./WeaponNFT.sol";
import "./Item1155.sol";

contract WeaponEquip is
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    WeaponNFT public weapons;
    Item1155 public items;

    mapping(uint256 => uint256[]) public equippedMods;

    event ModEquipped(uint256 indexed weaponId, uint256 modId, address indexed by);
    event ModUnequipped(uint256 indexed weaponId, uint256 modId, address indexed by);

    function initialize(
        address admin,
        address weaponAddr,
        address itemAddr
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        weapons = WeaponNFT(weaponAddr);
        items = Item1155(itemAddr);
    }

    function equip(uint256 weaponId, uint256 modId, uint256 amount) external nonReentrant {
        require(
            weapons.ownerOf(weaponId) == msg.sender ||
                weapons.userOf(weaponId) == msg.sender,
            "Not holder"
        );
        items.safeTransferFrom(msg.sender, address(this), modId, amount, "");
        equippedMods[weaponId].push(modId);
        emit ModEquipped(weaponId, modId, msg.sender);
    }

    function unequip(uint256 weaponId, uint256 modId, uint256 amount) external nonReentrant {
        require(
            weapons.ownerOf(weaponId) == msg.sender ||
                weapons.userOf(weaponId) == msg.sender,
            "Not holder"
        );
        items.safeTransferFrom(address(this), msg.sender, modId, amount, "");
        emit ModUnequipped(weaponId, modId, msg.sender);
    }

    function _authorizeUpgrade(address newImpl) internal override onlyRole(ADMIN_ROLE) {}
}
