// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Errors} from "../errors/Errors.sol";

/// @title CharacterSBT
/// @notice One-per-player, non-transferable character token. Burnable for recovery.
contract CharacterSBT extends ERC721, AccessControl {
    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");
    bytes32 public constant ENROLLER_ROLE  = keccak256("ENROLLER_ROLE");

    uint256 private _nextId = 1;
    mapping(address => bool) public hasCharacter;

    string private _base;

    constructor(address admin, string memory baseURI) ERC721("Riftline Character", "RCHAR") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _base = baseURI;
    }

    function mintCharacter(address to) external onlyRole(ENROLLER_ROLE) returns (uint256 tokenId) {
        if (hasCharacter[to]) revert Errors.AlreadyExists();
        tokenId = _nextId++;
        hasCharacter[to] = true;
        _mint(to, tokenId);
    }

    /// @dev Admin-assisted account recovery: owner or admin can burn to reissue.
    function burn(uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        if (msg.sender != owner && !hasRole(ADMIN_ROLE, msg.sender)) revert Errors.NotAuthorized();
        hasCharacter[owner] = false;
        _burn(tokenId);
    }

    // --- soulbound: block transfers ---
    function _update(address from, address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        if (from != address(0) && to != address(0)) revert Errors.TransferDisabled();
        if (to != address(0) && hasCharacter[to]) revert Errors.AlreadyExists();
        if (to != address(0)) hasCharacter[to] = true;
        return super._update(from, to, tokenId, auth);
    }

    function _baseURI() internal view override returns (string memory) {
        return _base;
    }

    function setBaseURI(string calldata base) external onlyRole(ADMIN_ROLE) {
        _base = base;
    }
}
