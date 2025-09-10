// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CrossServerGateway
/// @notice Emits events for off-chain relayers to mirror state across servers/chains.
contract CrossServerGateway is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    event TransferRequested(address indexed player, uint32 fromServer, uint32 toServer, bytes payload, uint256 nonce);
    event TransferExecuted(address indexed player, uint32 fromServer, uint32 toServer, bytes payload, uint256 nonce);

    uint256 public nonce;

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    function requestTransfer(uint32 fromSrv, uint32 toSrv, bytes calldata payload) external returns (uint256 n) {
        n = ++nonce;
        emit TransferRequested(msg.sender, fromSrv, toSrv, payload, n);
    }

    /// @dev Called by RELAYER when the destination server has processed a mirrored action.
    function confirmExecuted(address player, uint32 fromSrv, uint32 toSrv, uint256 n, bytes calldata payload)
        external onlyRole(RELAYER_ROLE)
    {
        emit TransferExecuted(player, fromSrv, toSrv, payload, n);
    }
}
