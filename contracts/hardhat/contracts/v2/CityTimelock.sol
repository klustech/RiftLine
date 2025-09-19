// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";

/// @title CityTimelock
/// @notice Upgradeable timelock controller for executing approved DAO proposals.
contract CityTimelock is Initializable, UUPSUpgradeable, TimelockControllerUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    function initialize(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) public override initializer {
        __TimelockController_init(minDelay, proposers, executors, admin);
        __UUPSUpgradeable_init();
        if (admin != address(0)) {
            _grantRole(ADMIN_ROLE, admin);
        }
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    uint256[49] private __gap;
}
