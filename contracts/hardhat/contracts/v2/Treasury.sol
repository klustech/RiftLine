// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Treasury is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE");
    bytes32 public constant EMITTER_ROLE = keccak256("EMITTER_ROLE");

    IERC20 public rft;

    struct Stream {
        address to;
        uint96 ratePerHour;
        uint64 lastPaid;
        bool active;
    }

    mapping(bytes32 => Stream) public streams;

    function initialize(address admin, IERC20 _rft) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        rft = _rft;
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function setStream(bytes32 key, address to, uint96 ratePerHour, bool active) external onlyRole(ADMIN_ROLE) {
        streams[key] = Stream({to: to, ratePerHour: ratePerHour, lastPaid: uint64(block.timestamp), active: active});
    }

    function accrueAndPay(bytes32 key) external onlyRole(EMITTER_ROLE) {
        Stream memory s = streams[key];
        require(s.active, "inactive");
        uint64 nowTs = uint64(block.timestamp);
        if (s.lastPaid == 0) {
            streams[key].lastPaid = nowTs;
            return;
        }
        uint64 hoursElapsed = (nowTs - s.lastPaid) / 3600;
        if (hoursElapsed == 0) return;
        uint256 due = uint256(s.ratePerHour) * hoursElapsed;
        streams[key].lastPaid = s.lastPaid + hoursElapsed * 3600;
        rft.transfer(s.to, due);
    }

    uint256[45] private __gap;
}
