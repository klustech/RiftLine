// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./WeaponNFT.sol";
import "./Item1155.sol";

contract Crafting is UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    WeaponNFT public weapons;
    Item1155 public items;
    uint256 public nextTokenId;

    event CraftedWeapon(address indexed to, uint256 tokenId);

    function initialize(
        address admin,
        address weaponAddr,
        address itemAddr,
        uint256 startId
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        weapons = WeaponNFT(weaponAddr);
        items = Item1155(itemAddr);
        nextTokenId = startId;
    }

    function craftAR(address to) external onlyRole(ADMIN_ROLE) {
        items.burn(to, 3001 /* MAT_STEEL */, 10);
        items.burn(to, 2002 /* MOD_SUPPRESSOR */, 1);

        uint256 id = nextTokenId++;
        WeaponNFT.WeaponBase memory base = WeaponNFT.WeaponBase({
            classId: WeaponNFT.WeaponClass.AR,
            modSlots: 4,
            rarity: 2,
            baseHash: uint32(uint256(keccak256("AR_v1")))
        });
        weapons.mintWeapon(to, id, base, "");
        emit CraftedWeapon(to, id);
    }

    function _authorizeUpgrade(address newImpl) internal override onlyRole(ADMIN_ROLE) {}
}
