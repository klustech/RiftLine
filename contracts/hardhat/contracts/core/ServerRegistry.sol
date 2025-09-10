// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Errors} from "../errors/Errors.sol";

/// @title ServerRegistry
/// @notice Tracks servers and per-server scarcity caps for properties & items.
contract ServerRegistry is AccessControl {
    bytes32 public constant ADMIN_ROLE          = keccak256("ADMIN_ROLE");
    bytes32 public constant SERVER_MANAGER_ROLE = keccak256("SERVER_MANAGER_ROLE");
    bytes32 public constant MINTER_ROLE         = keccak256("MINTER_ROLE");
    bytes32 public constant AUCTIONEER_ROLE     = keccak256("AUCTIONEER_ROLE");
    bytes32 public constant ORCHESTRATOR_ROLE   = keccak256("ORCHESTRATOR_ROLE");

    struct Server {
        bool active;
        string name;
    }

    // serverId => Server
    mapping(uint32 => Server) public servers;

    // Scarcity: caps & counters per kind per server
    // kind is a bytes32 key: e.g., keccak256("PROPERTY:DowntownShop") or keccak256("ITEM:Fuel")
    mapping(uint32 => mapping(bytes32 => uint256)) public serverCaps;
    mapping(uint32 => mapping(bytes32 => uint256)) public serverMinted;

    event ServerRegistered(uint32 indexed serverId, string name);
    event ServerToggled(uint32 indexed serverId, bool active);
    event CapSet(uint32 indexed serverId, bytes32 indexed kind, uint256 cap);
    event MintCount(uint32 indexed serverId, bytes32 indexed kind, uint256 newCount);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(SERVER_MANAGER_ROLE, admin);
    }

    // --- server mgmt ---
    function registerServer(uint32 serverId, string calldata name) external onlyRole(SERVER_MANAGER_ROLE) {
        if (servers[serverId].active) revert Errors.AlreadyExists();
        servers[serverId] = Server({active: true, name: name});
        emit ServerRegistered(serverId, name);
    }

    function setServerActive(uint32 serverId, bool active) external onlyRole(SERVER_MANAGER_ROLE) {
        if (bytes(servers[serverId].name).length == 0) revert Errors.ServerUnknown();
        servers[serverId].active = active;
        emit ServerToggled(serverId, active);
    }

    // --- scarcity caps ---
    function setCap(uint32 serverId, bytes32 kind, uint256 cap) external onlyRole(SERVER_MANAGER_ROLE) {
        if (!servers[serverId].active) revert Errors.NotActive();
        serverCaps[serverId][kind] = cap;
        emit CapSet(serverId, kind, cap);
    }

    function assertCanMint(uint32 serverId, bytes32 kind, uint256 amount) external view {
        if (!servers[serverId].active) revert Errors.NotActive();
        uint256 cap = serverCaps[serverId][kind];
        if (cap == 0) revert Errors.InvalidParam(); // require explicit caps
        uint256 minted = serverMinted[serverId][kind];
        if (minted + amount > cap) revert Errors.OverServerCap();
    }

    function bumpMinted(uint32 serverId, bytes32 kind, uint256 amount) external onlyRole(MINTER_ROLE) {
        // trust caller has validated via assertCanMint
        serverMinted[serverId][kind] += amount;
        emit MintCount(serverId, kind, serverMinted[serverId][kind]);
    }

    // convenience
    function kindKey(string memory ns, string memory name) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(ns, ":", name));
    }
}
