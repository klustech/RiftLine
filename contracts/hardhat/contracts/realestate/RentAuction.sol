// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PropertyNFT} from "./PropertyNFT.sol";
import {BusinessLicenseNFT} from "../licenses/BusinessLicenseNFT.sol";
import {Treasury} from "../treasury/Treasury.sol";
import {TokenLib} from "../libraries/TokenLib.sol";
import {Errors} from "../errors/Errors.sol";

/// @notice Generic English auction awarding time-bound user rights (ERC-4907) to winner.
contract RentAuction is AccessControl, ReentrancyGuard {
    using TokenLib for IERC20;

    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");
    bytes32 public constant AUCTIONEER_ROLE= keccak256("AUCTIONEER_ROLE");

    enum AssetType { Property, License }

    struct Auction {
        AssetType assetType;
        address   asset;       // PropertyNFT or BusinessLicenseNFT
        uint256   tokenId;
        address   payToken;    // address(0) => ETH
        uint64    startTime;
        uint64    endTime;
        uint64    leaseDuration; // seconds of use rights after settlement
        uint96    minBid;
        address   seller;      // normally the Vault (protocol)
        address   highestBidder;
        uint256   highestBid;
        bool      settled;
        uint16    feeBps;      // fee to treasury (e.g., 250 = 2.5%)
    }

    Treasury public immutable treasury;
    uint256 public auctionCount;
    mapping(uint256 => Auction) public auctions;

    event AuctionCreated(uint256 indexed id, address asset, uint256 tokenId, uint64 start, uint64 end);
    event BidPlaced(uint256 indexed id, address bidder, uint256 amount);
    event AuctionSettled(uint256 indexed id, address winner, uint256 amount, uint64 leaseEnd);

    constructor(address admin, Treasury _treasury) {
        treasury = _treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(AUCTIONEER_ROLE, admin);
    }

    function createAuction(
        AssetType aType,
        address asset,
        uint256 tokenId,
        address payToken,
        uint64 startTime,
        uint64 endTime,
        uint64 leaseDuration,
        uint96 minBid,
        address seller,
        uint16 feeBps
    ) external onlyRole(AUCTIONEER_ROLE) returns (uint256 id) {
        if (startTime >= endTime || leaseDuration == 0 || feeBps > 10_000) revert Errors.InvalidParam();
        id = ++auctionCount;
        auctions[id] = Auction({
            assetType: aType,
            asset: asset,
            tokenId: tokenId,
            payToken: payToken,
            startTime: startTime,
            endTime: endTime,
            leaseDuration: leaseDuration,
            minBid: minBid,
            seller: seller,
            highestBidder: address(0),
            highestBid: 0,
            settled: false,
            feeBps: feeBps
        });
        emit AuctionCreated(id, asset, tokenId, startTime, endTime);
    }

    function bid(uint256 id, uint256 amount) external payable nonReentrant {
        Auction storage a = auctions[id];
        if (block.timestamp < a.startTime) revert Errors.AuctionNotStarted();
        if (block.timestamp >= a.endTime) revert Errors.AuctionEnded();

        if (a.payToken == address(0)) {
            amount = msg.value;
        } else {
            if (amount == 0) revert Errors.InvalidParam();
            IERC20(a.payToken).transferFrom(msg.sender, address(this), amount);
        }

        uint256 minRequired = a.highestBid == 0 ? a.minBid : a.highestBid + ((a.highestBid * 5) / 1000); // +0.5%
        if (amount < minRequired) revert Errors.BidTooLow();

        // refund previous
        if (a.highestBidder != address(0)) {
            _payout(a.payToken, a.highestBidder, a.highestBid);
        }

        a.highestBidder = msg.sender;
        a.highestBid = amount;

        emit BidPlaced(id, msg.sender, amount);
    }

    function settle(uint256 id) external nonReentrant {
        Auction storage a = auctions[id];
        if (block.timestamp < a.endTime) revert Errors.SettlementNotReady();
        if (a.settled) return;
        a.settled = true;

        if (a.highestBidder == address(0)) revert Errors.NoBids();

        // fees
        uint256 fee = (a.highestBid * a.feeBps) / 10_000;
        uint256 sellerProceeds = a.highestBid - fee;

        // pay out
        _payout(a.payToken, address(treasury), fee);
        _payout(a.payToken, a.seller, sellerProceeds);

        // assign user rights
        uint64 leaseEnd = uint64(block.timestamp) + a.leaseDuration;

        if (a.assetType == AssetType.Property) {
            PropertyNFT(a.asset).setUser(a.tokenId, a.highestBidder, leaseEnd);
        } else {
            BusinessLicenseNFT(a.asset).setUser(a.tokenId, a.highestBidder, leaseEnd);
        }

        emit AuctionSettled(id, a.highestBidder, a.highestBid, leaseEnd);
    }

    function _payout(address payToken, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (payToken == address(0)) {
            (bool ok, ) = to.call{value: amount}("");
            require(ok, "ETH payout fail");
        } else {
            IERC20(payToken).transfer(to, amount);
        }
    }

    receive() external payable {}
}
