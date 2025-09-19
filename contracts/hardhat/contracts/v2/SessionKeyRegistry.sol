// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title SessionKeyRegistry
/// @notice Tracks limited-scope session keys for account abstraction paymasters/bundlers.
contract SessionKeyRegistry is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    struct Session {
        uint48 validAfter;
        uint48 validUntil;
        uint32 useLimit;
        uint32 used;
        bytes32 scope;
    }

    mapping(address => mapping(address => Session)) private _sessions; // account => key => session

    event SessionRegistered(
        address indexed account,
        address indexed key,
        bytes32 scope,
        uint48 validAfter,
        uint48 validUntil,
        uint32 useLimit
    );
    event SessionConsumed(address indexed account, address indexed key, uint32 remainingUses);
    event SessionRevoked(address indexed account, address indexed key);

    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, admin);
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function registerSessionKey(
        address key,
        bytes32 scope,
        uint48 validAfter,
        uint48 validUntil,
        uint32 useLimit
    ) external {
        require(key != address(0), "key zero");
        require(validUntil == 0 || validUntil > validAfter, "bad window");
        _sessions[msg.sender][key] = Session({
            validAfter: validAfter,
            validUntil: validUntil,
            useLimit: useLimit,
            used: 0,
            scope: scope
        });
        emit SessionRegistered(msg.sender, key, scope, validAfter, validUntil, useLimit);
    }

    function revokeSessionKey(address key) external {
        delete _sessions[msg.sender][key];
        emit SessionRevoked(msg.sender, key);
    }

    function consumeSession(address account, address key, bytes32 scope) external onlyRole(EXECUTOR_ROLE) returns (bool) {
        Session storage entry = _sessions[account][key];
        if (!_isSessionValid(entry, scope)) {
            return false;
        }
        if (entry.useLimit != 0) {
            entry.used += 1;
            if (entry.used > entry.useLimit) {
                delete _sessions[account][key];
                emit SessionRevoked(account, key);
                return false;
            }
            emit SessionConsumed(account, key, entry.useLimit - entry.used);
        } else {
            emit SessionConsumed(account, key, type(uint32).max);
        }
        return true;
    }

    function isSessionValid(address account, address key, bytes32 scope) external view returns (bool) {
        Session storage entry = _sessions[account][key];
        return _isSessionValid(entry, scope);
    }

    function session(address account, address key)
        external
        view
        returns (bytes32 scope, uint48 validAfter, uint48 validUntil, uint32 useLimit, uint32 used)
    {
        Session storage data = _sessions[account][key];
        return (data.scope, data.validAfter, data.validUntil, data.useLimit, data.used);
    }

    function _isSessionValid(Session storage session_, bytes32 scope) internal view returns (bool) {
        if (session_.validAfter == 0 && session_.validUntil == 0 && session_.useLimit == 0 && session_.scope == bytes32(0)) {
            return false;
        }
        if (session_.scope != bytes32(0) && scope != bytes32(0) && session_.scope != scope) {
            return false;
        }
        if (block.timestamp < session_.validAfter) {
            return false;
        }
        if (session_.validUntil != 0 && block.timestamp > session_.validUntil) {
            return false;
        }
        if (session_.useLimit != 0 && session_.used >= session_.useLimit) {
            return false;
        }
        return true;
    }

    uint256[47] private __gap;
}
