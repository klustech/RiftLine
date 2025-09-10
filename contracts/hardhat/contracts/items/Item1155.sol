// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ServerRegistry} from "../core/ServerRegistry.sol";
import {Errors} from "../errors/Errors.sol";

/// @title Item1155
/// @notice Server-scoped items with strict per-server mint caps enforced by ServerRegistry.
contract Item1155 extends ERC1155, AccessControl {
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    ServerRegistry public immutable registry;

    // Encodes (serverId << 128) | itemType
    function encodeId(uint32 serverId, uint128 itemType) public pure returns (uint256) {
        return (uint256(serverId) << 128) | uint256(itemType);
    }

    function decodeServer(uint256 id) public pure returns (uint32) {
        return uint32(id >> 128);
    }

    // optional per-id URI suffix
    mapping(uint256 => string) public uriOf;

    constructor(address admin, ServerRegistry _registry, string memory baseURI)
        ERC1155(baseURI)
    {
        registry = _registry;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function setURI(string calldata newURI) external onlyRole(ADMIN_ROLE) {
        _setURI(newURI);
    }

    function setTokenURI(uint256 id, string calldata u) external onlyRole(ADMIN_ROLE) {
        uriOf[id] = u;
    }

    function uri(uint256 id) public view override returns (string memory) {
        string memory su = uriOf[id];
        return bytes(su).length > 0 ? su : super.uri(id);
    }

    function mintServer(
        address to,
        uint32 serverId,
        uint128 itemType,
        uint256 amount,
        string calldata _uriIfNew, // optional
        bytes calldata data
    ) external onlyRole(MINTER_ROLE) {
        bytes32 kind = keccak256(abi.encodePacked("ITEM:", itemType));
        registry.assertCanMint(serverId, kind, amount);
        uint256 id = encodeId(serverId, itemType);
        if (bytes(_uriIfNew).length != 0 && bytes(uriOf[id]).length == 0) {
            uriOf[id] = _uriIfNew;
        }
        _mint(to, id, amount, data);
        registry.bumpMinted(serverId, kind, amount);
    }
}
