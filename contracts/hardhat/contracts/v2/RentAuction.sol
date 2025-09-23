// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BusinessLicenseNFT} from "./BusinessLicenseNFT.sol";

contract RentAuction is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IERC20 public rft;
    BusinessLicenseNFT public license;
    uint64 public snipeExtend;
    address public treasury;

    struct Lot {
        uint256 tokenId;
        uint64 startTime;
        uint64 endTime;
        uint64 leaseSeconds;
        uint96 reserve;
        uint96 minIncrement;
        address highBidder;
        uint96 highBid;
    }

    mapping(uint256 => Lot) public lots;
    uint256 public totalLots;

    event LotCreated(uint256 indexed lotId, uint256 tokenId, uint64 start, uint64 end, uint64 leaseSeconds, uint96 reserve);
    event Bid(uint256 indexed lotId, address bidder, uint96 amount, uint64 newEnd);
    event Settled(uint256 indexed lotId, address winner, uint96 amount, uint64 leaseUntil);
    event LotCancelled(uint256 indexed lotId, address indexed actor);
    event LotRelisted(uint256 indexed lotId, uint256 tokenId, uint64 start, uint64 end, uint64 leaseSeconds, uint96 reserve);

    function initialize(address admin, IERC20 _rft, BusinessLicenseNFT _lic, address _treasury) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        rft = _rft;
        license = _lic;
        treasury = _treasury;
        snipeExtend = 300;
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function createLot(
        uint256 tokenId,
        uint64 start,
        uint64 end,
        uint64 leaseSeconds,
        uint96 reserve,
        uint96 minIncrement
    ) external onlyRole(ADMIN_ROLE) returns (uint256 lotId) {
        require(end > start && leaseSeconds > 0, "bad params");
        lotId = ++totalLots;
        lots[lotId] = Lot({
            tokenId: tokenId,
            startTime: start,
            endTime: end,
            leaseSeconds: leaseSeconds,
            reserve: reserve,
            minIncrement: minIncrement,
            highBidder: address(0),
            highBid: 0
        });
        emit LotCreated(lotId, tokenId, start, end, leaseSeconds, reserve);
    }

    function bid(uint256 lotId, uint96 amount) external {
        Lot memory L = lots[lotId];
        require(L.leaseSeconds > 0, "inactive");
        require(block.timestamp >= L.startTime && block.timestamp < L.endTime, "not live");
        uint96 minBid = L.highBid == 0 ? L.reserve : L.highBid + L.minIncrement;
        require(amount >= minBid, "low bid");

        rft.transferFrom(msg.sender, address(this), amount);

        if (L.highBidder != address(0)) {
            rft.transfer(L.highBidder, L.highBid);
        }

        L.highBidder = msg.sender;
        L.highBid = amount;

        if (L.endTime - uint64(block.timestamp) <= snipeExtend) {
            L.endTime += snipeExtend;
        }

        lots[lotId] = L;
        emit Bid(lotId, msg.sender, amount, L.endTime);
    }

    function settle(uint256 lotId) external {
        Lot memory L = lots[lotId];
        require(L.leaseSeconds > 0, "inactive");
        require(block.timestamp >= L.endTime, "not ended");
        require(L.highBidder != address(0), "no bids");

        rft.transfer(treasury, L.highBid);
        uint64 leaseUntil = uint64(block.timestamp) + L.leaseSeconds;
        license.setUser(L.tokenId, L.highBidder, leaseUntil);

        emit Settled(lotId, L.highBidder, L.highBid, leaseUntil);
        delete lots[lotId];
    }

    function cancel(uint256 lotId) external onlyRole(ADMIN_ROLE) {
        Lot storage L = lots[lotId];
        require(L.tokenId != 0, "unknown lot");
        if (L.highBidder != address(0) && L.highBid > 0) {
            rft.transfer(L.highBidder, L.highBid);
        }
        L.highBidder = address(0);
        L.highBid = 0;
        L.startTime = 0;
        L.endTime = 0;
        L.leaseSeconds = 0;
        L.reserve = 0;
        L.minIncrement = 0;
        emit LotCancelled(lotId, _msgSender());
    }

    function relist(
        uint256 lotId,
        uint256 tokenId,
        uint64 start,
        uint64 end,
        uint64 leaseSeconds,
        uint96 reserve,
        uint96 minIncrement
    ) external onlyRole(ADMIN_ROLE) {
        require(end > start && leaseSeconds > 0, "bad params");
        Lot storage L = lots[lotId];
        require(L.tokenId != 0, "unknown lot");
        require(L.highBidder == address(0) && L.highBid == 0, "pending bid");
        require(L.leaseSeconds == 0 || block.timestamp >= L.endTime, "lot active");

        if (tokenId == 0) {
            tokenId = L.tokenId;
        }
        require(tokenId != 0, "token required");
        L.tokenId = tokenId;
        L.startTime = start;
        L.endTime = end;
        L.leaseSeconds = leaseSeconds;
        L.reserve = reserve;
        L.minIncrement = minIncrement;

        emit LotRelisted(lotId, tokenId, start, end, leaseSeconds, reserve);
    }

    uint256[43] private __gap;
}
