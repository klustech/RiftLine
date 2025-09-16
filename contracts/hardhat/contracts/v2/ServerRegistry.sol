hardhat/contracts/v2/ServerRegistry.sol
New
+70
-0

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract ServerRegistry is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE          = keccak256("ADMIN_ROLE");
    bytes32 public constant SERVER_MANAGER_ROLE = keccak256("SERVER_MANAGER_ROLE");
    bytes32 public constant MINTER_ROLE         = keccak256("MINTER_ROLE");

    struct Server {
        bool active;
        string name;
    }

    mapping(uint32 => Server) public servers;
    mapping(uint32 => mapping(bytes32 => uint256)) public serverCaps;
    mapping(uint32 => mapping(bytes32 => uint256)) public serverMinted;

    event ServerRegistered(uint32 indexed serverId, string name);
    event ServerToggled(uint32 indexed serverId, bool active);
    event CapSet(uint32 indexed serverId, bytes32 indexed kind, uint256 cap);

    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(SERVER_MANAGER_ROLE, admin);
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function kindKey(string memory ns, string memory name) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(ns, ":", name));
    }

    function registerServer(uint32 serverId, string calldata name) external onlyRole(SERVER_MANAGER_ROLE) {
        require(bytes(servers[serverId].name).length == 0, "exists");
        servers[serverId] = Server({active: true, name: name});
        emit ServerRegistered(serverId, name);
    }

    function setServerActive(uint32 serverId, bool active) external onlyRole(SERVER_MANAGER_ROLE) {
        require(bytes(servers[serverId].name).length != 0, "unknown");
        servers[serverId].active = active;
        emit ServerToggled(serverId, active);
    }

    function setCap(uint32 serverId, bytes32 kind, uint256 cap) external onlyRole(SERVER_MANAGER_ROLE) {
        require(servers[serverId].active, "inactive");
        serverCaps[serverId][kind] = cap;
        emit CapSet(serverId, kind, cap);
    }

    function assertCanMint(uint32 serverId, bytes32 kind, uint256 amount) external view {
        require(servers[serverId].active, "inactive");
        uint256 cap = serverCaps[serverId][kind];
        require(cap != 0, "no cap");
        require(serverMinted[serverId][kind] + amount <= cap, "cap exceeded");
    }

    function bumpMinted(uint32 serverId, bytes32 kind, uint256 amount) external onlyRole(MINTER_ROLE) {
        serverMinted[serverId][kind] += amount;
    }

    uint256[45] private __gap;
}
