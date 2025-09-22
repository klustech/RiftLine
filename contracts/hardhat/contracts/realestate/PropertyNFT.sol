// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC4907} from "../interfaces/IERC4907.sol";
import {Errors} from "../errors/Errors.sol";

/// @dev Minimal ERC-4907 mixin.
abstract contract ERC4907Core is ERC721, IERC4907 {
    struct UserInfo { address user; uint64 expires; }
    mapping(uint256 => UserInfo) internal _users;

    function setUser(uint256 tokenId, address user, uint64 expires) public virtual override {
        require(_isAuthorized(_ownerOf(tokenId), msg.sender, tokenId), "Not auth");
        _users[tokenId] = UserInfo(user, expires);
        emit UpdateUser(tokenId, user, expires);
    }

    function userOf(uint256 tokenId) public view override returns (address) {
        if (uint64(block.timestamp) <= _users[tokenId].expires) {
            return _users[tokenId].user;
        }
        return address(0);
    }

    function userExpires(uint256 tokenId) public view override returns (uint256) {
        return _users[tokenId].expires;
    }

    function supportsInterface(bytes4 iid) public view virtual override(ERC721) returns (bool) {
        return iid == type(IERC4907).interfaceId || super.supportsInterface(iid);
    }
}

/// @title PropertyNFT
/// @notice Server-scoped properties. Ownership is held by a vault; players only get time-bound "user" rights.
contract PropertyNFT is ERC4907Core, AccessControl {
    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE  = keccak256("MINTER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE"); // can setUser

    // tokenId => serverId
    mapping(uint256 => uint32) public serverOf;
    // tokenId => kind key (e.g., keccak256("PROPERTY:DowntownShop"))
    mapping(uint256 => bytes32) public kindOf;
    string private _base;
    uint256 public totalMinted;

    constructor(address admin, string memory baseURI) ERC721("Riftline Properties", "RPROP") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _base = baseURI;
    }

    function mintToVault(
        address vault,
        uint32 serverId,
        bytes32 kindKey,
        bytes32 metaHash
    ) external onlyRole(MINTER_ROLE) returns (uint256 id) {
        id = ++totalMinted;
        _mint(vault, id);
        serverOf[id] = serverId;
        kindOf[id]   = kindKey;
        // `metaHash` can be included in tokenURI off-chain metadata; store if you want:
        // (optional) store metaHash mapping if needed.
    }

    /// @dev Only MANAGER_ROLE (e.g., RentAuction) may assign user periods.
    function setUser(uint256 tokenId, address user, uint64 expires) public override onlyRole(MANAGER_ROLE) {
        super.setUser(tokenId, user, expires);
    }

    // Disable public transfers: properties are protocol-owned (vault) and not tradable.
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Errors.TransferDisabled();
        return super._update(to, tokenId, auth);
    }

    function setBaseURI(string calldata b) external onlyRole(ADMIN_ROLE) { _base = b; }
    function _baseURI() internal view override returns (string memory) { return _base; }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC4907Core, AccessControl)
        returns (bool)
    {
        return ERC4907Core.supportsInterface(interfaceId) || AccessControl.supportsInterface(interfaceId);
    }
}
