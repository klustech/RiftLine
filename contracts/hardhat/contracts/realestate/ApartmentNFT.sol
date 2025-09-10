// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Errors} from "../errors/Errors.sol";

/// @title ApartmentNFT
/// @notice Globally ownable, transferrable apartments with optional royalties.
contract ApartmentNFT is ERC721, ERC2981, AccessControl {
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public immutable maxSupply;
    uint256 public totalMinted;
    string  private _base;

    mapping(uint256 => bytes32) public apartmentMeta; // e.g. hashed coordinates/zone

    constructor(address admin, uint96 defaultRoyaltyBps, uint256 _maxSupply, string memory baseURI)
        ERC721("Riftline Apartments", "RAPT")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        if (defaultRoyaltyBps > 0) _setDefaultRoyalty(admin, defaultRoyaltyBps);
        maxSupply = _maxSupply;
        _base = baseURI;
    }

    function mint(address to, bytes32 meta) external onlyRole(MINTER_ROLE) returns (uint256 id) {
        if (totalMinted == maxSupply) revert Errors.OverServerCap();
        id = ++totalMinted;
        _mint(to, id);
        apartmentMeta[id] = meta;
    }

    function setBaseURI(string calldata b) external onlyRole(ADMIN_ROLE) { _base = b; }

    function _baseURI() internal view override returns (string memory) { return _base; }

    // --- ERC165 ---
    function supportsInterface(bytes4 iid)
        public view override(ERC721, ERC2981) returns (bool)
    { return super.supportsInterface(iid); }
}
