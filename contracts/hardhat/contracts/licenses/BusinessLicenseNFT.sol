// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC4907} from "../interfaces/IERC4907.sol";
import {Errors} from "../errors/Errors.sol";

abstract contract ERC4907Lite is ERC721, IERC4907 {
    struct UserInfo { address user; uint64 expires; }
    mapping(uint256 => UserInfo) internal _users;

    function setUser(uint256 tokenId, address user, uint64 expires) public virtual override {
        require(_isAuthorized(_ownerOf(tokenId), msg.sender, tokenId), "Not auth");
        _users[tokenId] = UserInfo(user, expires);
        emit UpdateUser(tokenId, user, expires);
    }

    function userOf(uint256 tokenId) public view override returns (address) {
        return (uint64(block.timestamp) <= _users[tokenId].expires) ? _users[tokenId].user : address(0);
    }
    function userExpires(uint256 tokenId) public view override returns (uint256) { return _users[tokenId].expires; }
}

contract BusinessLicenseNFT extends ERC4907Lite, AccessControl {
    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE  = keccak256("MINTER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    mapping(uint256 => uint32) public serverOf;
    mapping(uint256 => bytes32) public kindOf; // e.g., keccak256("LICENSE:Taxi"), keccak256("LICENSE:Cafe")
    string private _base;
    uint256 public totalMinted;

    constructor(address admin, string memory baseURI) ERC721("Riftline Business License", "RLIC") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _base = baseURI;
    }

    function mintToVault(address vault, uint32 serverId, bytes32 kindKey) external onlyRole(MINTER_ROLE) returns (uint256 id) {
        id = ++totalMinted;
        _mint(vault, id);
        serverOf[id] = serverId;
        kindOf[id] = kindKey;
    }

    function setUser(uint256 tokenId, address user, uint64 expires) public override onlyRole(MANAGER_ROLE) {
        super.setUser(tokenId, user, expires);
    }

    function _update(address from, address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        if (from != address(0) && to != address(0)) revert Errors.TransferDisabled();
        return super._update(from, to, tokenId, auth);
    }

    function setBaseURI(string calldata b) external onlyRole(ADMIN_ROLE) { _base = b; }
    function _baseURI() internal view override returns (string memory) { return _base; }
}
