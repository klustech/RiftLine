hardhat/contracts/weapons/WeaponNFT.sol
New
+115
-0

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Minimal IERC4907 interface
interface IERC4907 {
    event UpdateUser(uint256 tokenId, address user, uint64 expires);
    function setUser(uint256 tokenId, address user, uint64 expires) external;
    function userOf(uint256 tokenId) external view returns (address);
    function userExpires(uint256 tokenId) external view returns (uint256);
}

contract WeaponNFT is
    ERC721Upgradeable,
    ERC2981Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC4907
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    enum WeaponClass {
        Melee,
        Pistol,
        SMG,
        Shotgun,
        AR,
        DMR,
        Sniper,
        Heavy,
        Special
    }

    struct WeaponBase {
        WeaponClass classId;
        uint16 modSlots;
        uint16 rarity;
        uint32 baseHash;
    }

    mapping(uint256 => WeaponBase) public weaponBase;
    mapping(uint256 => string) public tokenURIOverride;

    struct UserInfo {
        address user;
        uint64 expires;
    }

    mapping(uint256 => UserInfo) private _users;

    function initialize(
        address admin,
        address royaltyReceiver,
        uint96 royaltyBps
    ) public initializer {
        __ERC721_init("Game Weapon", "GWEAP");
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _setDefaultRoyalty(royaltyReceiver, royaltyBps);
    }

    function mintWeapon(
        address to,
        uint256 tokenId,
        WeaponBase calldata base,
        string calldata uri
    ) external onlyRole(ADMIN_ROLE) {
        _safeMint(to, tokenId);
        weaponBase[tokenId] = base;
        if (bytes(uri).length != 0) {
            tokenURIOverride[tokenId] = uri;
        }
    }

    function setUser(uint256 tokenId, address user, uint64 expires) external override {
        require(ownerOf(tokenId) == _msgSender(), "Not owner");
        _users[tokenId] = UserInfo(user, expires);
        emit UpdateUser(tokenId, user, expires);
    }

    function userOf(uint256 tokenId) public view override returns (address) {
        return
            (uint64(block.timestamp) <= _users[tokenId].expires)
                ? _users[tokenId].user
                : address(0);
    }

    function userExpires(uint256 tokenId) external view override returns (uint256) {
        return _users[tokenId].expires;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        string memory u = tokenURIOverride[tokenId];
        return bytes(u).length > 0 ? u : super.tokenURI(tokenId);
    }

    function _authorizeUpgrade(address newImpl) internal override onlyRole(ADMIN_ROLE) {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC2981Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
