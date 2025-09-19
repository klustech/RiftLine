// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC4907} from "./interfaces/IERC4907.sol";

contract VehicleNFT is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ERC721Upgradeable, IERC4907 {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    string private _base;
    uint256 public total;

    struct Specs {
        uint16 maxKph;
        uint16 accelMs;
        uint16 handling;
        uint16 fuel;
        uint8 seats;
        uint8 vclass;
        uint8 armor;
        uint8 flags;
        uint32 price;
    }

    mapping(uint256 => Specs) public specsOf;
    mapping(uint256 => UserInfo) private _users;
    mapping(uint256 => bool) public destroyed;

    struct UserInfo {
        address user;
        uint64 expires;
    }

    event VehicleLeased(uint256 indexed tokenId, address indexed user, uint64 expiresAt);
    event VehicleLeaseCleared(uint256 indexed tokenId);
    event VehicleSeized(uint256 indexed tokenId, address indexed newOwner);
    event VehicleDestroyed(uint256 indexed tokenId);

    function initialize(address admin, string memory baseURI) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ERC721_init("Rift Vehicle", "RVHL");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(CUSTODIAN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _base = baseURI;
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function mint(address to, Specs calldata s) external onlyRole(ADMIN_ROLE) returns (uint256 id) {
        id = ++total;
        _safeMint(to, id);
        specsOf[id] = s;
    }

    function setBaseURI(string calldata b) external onlyRole(ADMIN_ROLE) {
        _base = b;
    }

    function setUser(uint256 tokenId, address user, uint64 expires) external {
        require(_isController(msg.sender, tokenId), "not authorized");
        require(!destroyed[tokenId], "destroyed");
        _users[tokenId] = UserInfo(user, expires);
        emit VehicleLeased(tokenId, user, expires);
    }

    function clearUser(uint256 tokenId) external {
        require(_isController(msg.sender, tokenId), "not authorized");
        delete _users[tokenId];
        emit VehicleLeaseCleared(tokenId);
    }

    function userOf(uint256 tokenId) external view override returns (address) {
        UserInfo memory info = _users[tokenId];
        if (uint64(block.timestamp) < info.expires) {
            return info.user;
        }
        return address(0);
    }

    function userExpires(uint256 tokenId) external view override returns (uint256) {
        return _users[tokenId].expires;
    }

    function seize(uint256 tokenId, address recipient) external onlyRole(CUSTODIAN_ROLE) {
        require(!destroyed[tokenId], "destroyed");
        address owner = ownerOf(tokenId);
        _transfer(owner, recipient, tokenId);
        delete _users[tokenId];
        emit VehicleSeized(tokenId, recipient);
    }

    function destroy(uint256 tokenId) external onlyRole(ADMIN_ROLE) {
        require(!destroyed[tokenId], "destroyed");
        destroyed[tokenId] = true;
        delete _users[tokenId];
        _burn(tokenId);
        emit VehicleDestroyed(tokenId);
    }

    function _isController(address spender, uint256 tokenId) internal view returns (bool) {
        if (hasRole(ADMIN_ROLE, spender) || hasRole(OPERATOR_ROLE, spender)) {
            return true;
        }
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
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

    uint256[45] private __gap;
}
