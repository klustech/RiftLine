// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC4907} from "./interfaces/IERC4907.sol";
import {ServerRegistry} from "./ServerRegistry.sol";

contract BusinessLicenseNFT is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ERC721Upgradeable, IERC4907 {
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct UserInfo {
        address user;
        uint64 expires;
    }

    mapping(uint256 => UserInfo) private _users;

    ServerRegistry public registry;
    address public vault;
    string private _base;
    uint256 public total;
    mapping(uint256 => uint32) public serverOf;
    mapping(uint256 => bytes32) public kindOf;

    function initialize(address admin, ServerRegistry r, address _vault, string memory baseURI) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ERC721_init("Rift Business License", "RBL");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        registry = r;
        vault = _vault;
        _base = baseURI;
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function setBaseURI(string calldata b) external onlyRole(ADMIN_ROLE) {
        _base = b;
    }

    function mint(uint32 serverId, bytes32 kind) external onlyRole(MINTER_ROLE) returns (uint256 id) {
        registry.assertCanMint(serverId, kind, 1);
        id = ++total;
        _safeMint(vault, id);
        serverOf[id] = serverId;
        kindOf[id] = kind;
        registry.bumpMinted(serverId, kind, 1);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            revert("transfer disabled");
        }
        return from;
    }

    function setUser(uint256 tokenId, address user, uint64 expires) external onlyRole(ADMIN_ROLE) {
        _users[tokenId] = UserInfo(user, expires);
        emit UpdateUser(tokenId, user, expires);
    }

    function userOf(uint256 tokenId) external view returns (address) {
        if (uint64(block.timestamp) < _users[tokenId].expires) {
            return _users[tokenId].user;
        }
        return address(0);
    }

    function userExpires(uint256 tokenId) external view returns (uint256) {
        return _users[tokenId].expires;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        return string(abi.encodePacked(_base, Strings.toString(id)));
    }

    function supportsInterface(bytes4 iid)
        public
        view
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return iid == type(IERC4907).interfaceId || super.supportsInterface(iid);
    }

    uint256[43] private __gap;
}
