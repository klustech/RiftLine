// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {ServerRegistry} from "./ServerRegistry.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

/// @title CrossServerGateway
/// @notice Manages cross-shard travel requests and confirmations between mobile shards.
contract CrossServerGateway is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    EIP712Upgradeable
{
    enum TransferStatus {
        None,
        Pending,
        Committed,
        Finalized,
        Cancelled,
        Failed
    }

    struct TransferTicket {
        address player;
        uint32 fromShard;
        uint32 toShard;
        uint64 requestedAt;
        uint64 committedAt;
        uint64 finalizedAt;
        TransferStatus status;
        bytes32 payloadHash;
        bytes32 arrivalHash;
        bytes32 ackHash;
        bytes32 failureHash;
    }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    ServerRegistry public serverRegistry;
    uint256 public nextTransferId;

    mapping(uint256 => TransferTicket) public transfers;
    mapping(address => uint256) public activeTransferOf;
    mapping(address => uint32) public currentShardOf;
    mapping(address => uint256) public relayerNonces;

    bytes32 private constant COMMIT_TYPEHASH = keccak256("Commit(uint256 transferId,bytes32 arrivalHash,uint256 nonce)");

    event ServerRegistryUpdated(address indexed registry);
    event CurrentShardSet(address indexed player, uint32 shardId);
    event TransferRequested(
        uint256 indexed transferId,
        address indexed player,
        uint32 indexed fromShard,
        uint32 toShard,
        bytes payload
    );
    event TransferCommitted(uint256 indexed transferId, bytes arrivalPayload);
    event TransferFinalized(uint256 indexed transferId, bytes acknowledgementPayload);
    event TransferCancelled(uint256 indexed transferId, address indexed cancelledBy);
    event TransferFailed(uint256 indexed transferId, address indexed relayer, bytes reason);

    function initialize(address admin, ServerRegistry registry) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __EIP712_init("CrossServerGateway", "2");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(RELAYER_ROLE, admin);
        serverRegistry = registry;
        emit ServerRegistryUpdated(address(registry));
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function setServerRegistry(ServerRegistry registry) external onlyRole(ADMIN_ROLE) {
        serverRegistry = registry;
        emit ServerRegistryUpdated(address(registry));
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function setInitialShard(address player, uint32 shardId) external onlyRole(ADMIN_ROLE) {
        _assertActiveShard(shardId);
        currentShardOf[player] = shardId;
        emit CurrentShardSet(player, shardId);
    }

    function requestTransfer(uint32 fromShard, uint32 toShard, bytes calldata payload)
        external
        whenNotPaused
        returns (uint256 transferId)
    {
        _assertActiveShard(fromShard);
        _assertActiveShard(toShard);
        require(fromShard != toShard, "same shard");
        require(currentShardOf[msg.sender] == fromShard, "wrong shard");
        require(activeTransferOf[msg.sender] == 0, "transfer active");

        transferId = ++nextTransferId;
        transfers[transferId] = TransferTicket({
            player: msg.sender,
            fromShard: fromShard,
            toShard: toShard,
            requestedAt: uint64(block.timestamp),
            committedAt: 0,
            finalizedAt: 0,
            status: TransferStatus.Pending,
            payloadHash: keccak256(payload),
            arrivalHash: bytes32(0),
            ackHash: bytes32(0),
            failureHash: bytes32(0)
        });
        activeTransferOf[msg.sender] = transferId;

        emit TransferRequested(transferId, msg.sender, fromShard, toShard, payload);
    }

    function commitTransfer(uint256 transferId, bytes calldata arrivalPayload) external onlyRole(RELAYER_ROLE) {
        _commitTransfer(transferId, arrivalPayload);
    }

    function commitTransferWithSig(
        uint256 transferId,
        bytes calldata arrivalPayload,
        address signer,
        bytes calldata signature
    ) external {
        require(hasRole(RELAYER_ROLE, signer), "invalid relayer");
        uint256 nonce = relayerNonces[signer];
        bytes32 structHash = keccak256(abi.encode(COMMIT_TYPEHASH, transferId, keccak256(arrivalPayload), nonce));
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSAUpgradeable.recover(digest, signature);
        require(recovered == signer, "invalid signature");
        relayerNonces[signer] = nonce + 1;
        _commitTransfer(transferId, arrivalPayload);
    }

    function finalizeTransfer(uint256 transferId, bytes calldata acknowledgementPayload) external whenNotPaused {
        TransferTicket storage ticket = transfers[transferId];
        require(ticket.status == TransferStatus.Committed, "not committed");
        require(msg.sender == ticket.player || hasRole(ADMIN_ROLE, msg.sender), "not authorized");
        ticket.status = TransferStatus.Finalized;
        ticket.finalizedAt = uint64(block.timestamp);
        ticket.ackHash = keccak256(acknowledgementPayload);
        currentShardOf[ticket.player] = ticket.toShard;
        activeTransferOf[ticket.player] = 0;
        emit TransferFinalized(transferId, acknowledgementPayload);
    }

    function _commitTransfer(uint256 transferId, bytes calldata arrivalPayload) internal {
        TransferTicket storage ticket = transfers[transferId];
        require(ticket.status == TransferStatus.Pending, "not pending");
        ticket.status = TransferStatus.Committed;
        ticket.committedAt = uint64(block.timestamp);
        ticket.arrivalHash = keccak256(arrivalPayload);
        ticket.failureHash = bytes32(0);
        emit TransferCommitted(transferId, arrivalPayload);
    }

    function cancelTransfer(uint256 transferId) external whenNotPaused {
        TransferTicket storage ticket = transfers[transferId];
        require(ticket.status == TransferStatus.Pending, "not cancellable");
        require(msg.sender == ticket.player || hasRole(ADMIN_ROLE, msg.sender) || hasRole(RELAYER_ROLE, msg.sender), "not authorized");
        ticket.status = TransferStatus.Cancelled;
        activeTransferOf[ticket.player] = 0;
        ticket.failureHash = bytes32(0);
        emit TransferCancelled(transferId, msg.sender);
    }

    function failTransfer(uint256 transferId, bytes calldata reason) external onlyRole(RELAYER_ROLE) {
        TransferTicket storage ticket = transfers[transferId];
        require(
            ticket.status == TransferStatus.Pending || ticket.status == TransferStatus.Committed,
            "not active"
        );
        ticket.status = TransferStatus.Failed;
        ticket.finalizedAt = uint64(block.timestamp);
        ticket.failureHash = keccak256(reason);
        activeTransferOf[ticket.player] = 0;
        emit TransferFailed(transferId, msg.sender, reason);
    }

    function activeTransfer(address player) external view returns (TransferTicket memory ticket) {
        uint256 transferId = activeTransferOf[player];
        if (transferId != 0) {
            ticket = transfers[transferId];
        }
    }

    function _assertActiveShard(uint32 shardId) internal view {
        require(address(serverRegistry) != address(0), "registry unset");
        (bool active, string memory name) = _serverInfo(shardId);
        require(bytes(name).length != 0 && active, "inactive shard");
    }

    function _serverInfo(uint32 shardId) internal view returns (bool active, string memory name) {
        (active, name) = serverRegistry.servers(shardId);
    }

    uint256[42] private __gap;
}
