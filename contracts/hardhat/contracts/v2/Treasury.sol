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
        address asset;
        address to;
        uint96 ratePerHour;
        uint64 lastPaid;
        bool active;
    }

    mapping(bytes32 => Stream) public streams;

    event StreamConfigured(bytes32 indexed key, address indexed asset, address indexed to, uint96 ratePerHour, bool active);
    event StreamPaid(bytes32 indexed key, address indexed asset, address indexed to, uint256 amount, uint64 paidThrough);
    event FundsWithdrawn(address indexed asset, address indexed to, uint256 amount);

    function initialize(address admin, IERC20 _rft) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        rft = _rft;
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function setStream(bytes32 key, address asset, address to, uint96 ratePerHour, bool active)
        external
        onlyRole(ADMIN_ROLE)
    {
        streams[key] = Stream({
            asset: asset,
            to: to,
            ratePerHour: ratePerHour,
            lastPaid: uint64(block.timestamp),
            active: active
        });
        emit StreamConfigured(key, asset, to, ratePerHour, active);
    }

    function accrueAndPay(bytes32 key) external onlyRole(EMITTER_ROLE) {
        Stream storage s = streams[key];
        require(s.active, "inactive");
        uint64 nowTs = uint64(block.timestamp);
        if (s.lastPaid == 0) {
            s.lastPaid = nowTs;
            return;
        }
        uint64 hoursElapsed = (nowTs - s.lastPaid) / 3600;
        if (hoursElapsed == 0) return;
        uint256 due = uint256(s.ratePerHour) * hoursElapsed;
        s.lastPaid += hoursElapsed * 3600;

        address asset = s.asset != address(0) ? s.asset : address(rft);
        require(asset != address(0), "asset required");
        if (asset == address(0)) {
            (bool ok, ) = s.to.call{value: due}("");
            require(ok, "eth transfer failed");
        } else {
            IERC20(asset).transfer(s.to, due);
        }

        emit StreamPaid(key, asset, s.to, due, s.lastPaid);
    }

    function withdraw(address asset, address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "invalid recipient");
        if (asset == address(0)) {
            (bool ok, ) = to.call{value: amount}("");
            require(ok, "eth transfer failed");
        } else {
            IERC20(asset).transfer(to, amount);
        }
        emit FundsWithdrawn(asset, to, amount);
    }

    receive() external payable {}

    uint256[45] private __gap;
}
