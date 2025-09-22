// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {RentAuction} from "contracts/v2/RentAuction.sol";
import {RiftToken} from "contracts/v2/RiftToken.sol";
import {BusinessLicenseNFT} from "contracts/v2/BusinessLicenseNFT.sol";
import {ServerRegistry} from "contracts/v2/ServerRegistry.sol";
import {Treasury} from "contracts/v2/Treasury.sol";
import {PropertyVault} from "contracts/realestate/PropertyVault.sol";

contract RentAuctionFuzz is Test {
    RentAuction internal auction;
    RiftToken internal token;
    BusinessLicenseNFT internal license;
    ServerRegistry internal registry;
    Treasury internal treasury;
    PropertyVault internal vault;

    uint256 internal lotId;
    uint256 internal licenseTokenId;

    address internal bidder1 = address(0xB1D);
    address internal bidder2 = address(0xB2D);

    function setUp() public {
        registry = new ServerRegistry();
        registry.initialize(address(this));
        registry.registerServer(1, "Test Server");
        bytes32 kind = registry.kindKey("BUS", "TEST");
        registry.setCap(1, kind, 5);

        vault = new PropertyVault(address(this));

        license = new BusinessLicenseNFT();
        license.initialize(address(this), registry, address(vault), "");
        license.grantRole(license.MINTER_ROLE(), address(this));
        registry.grantRole(registry.MINTER_ROLE(), address(license));
        licenseTokenId = license.mint(1, kind);

        token = new RiftToken();
        token.initialize(address(this));
        token.grantRole(token.MINTER_ROLE(), address(this));

        treasury = new Treasury();
        treasury.initialize(address(this), token);

        auction = new RentAuction();
        auction.initialize(address(this), token, license, address(treasury));
        license.grantRole(license.ADMIN_ROLE(), address(auction));

        token.mint(bidder1, 1_000 ether);
        token.mint(bidder2, 1_000 ether);
        vm.prank(bidder1);
        token.approve(address(auction), type(uint256).max);
        vm.prank(bidder2);
        token.approve(address(auction), type(uint256).max);

        uint64 start = uint64(block.timestamp);
        uint64 end = start + 1 hours;
        lotId = auction.createLot(licenseTokenId, start, end, 7 days, 100 ether, 10 ether);
    }

    function testFuzz_BidsMustIncrease(uint96 firstBid, uint96 secondBid) public {
        firstBid = uint96(bound(firstBid, 100 ether, 500 ether));
        secondBid = uint96(bound(secondBid, 100 ether, 600 ether));

        vm.prank(bidder1);
        auction.bid(lotId, firstBid);

        if (secondBid <= firstBid + 9 ether) {
            vm.expectRevert(bytes("low bid"));
            vm.prank(bidder2);
            auction.bid(lotId, secondBid);
        } else {
            vm.prank(bidder2);
            auction.bid(lotId, secondBid);
        }
    }

    function testCannotSettleBeforeEnd() public {
        vm.prank(bidder1);
        auction.bid(lotId, 120 ether);
        vm.expectRevert(bytes("not ended"));
        auction.settle(lotId);
        vm.warp(block.timestamp + 2 hours);
        auction.settle(lotId);

        assertEq(token.balanceOf(address(treasury)), 120 ether);
        assertEq(license.userOf(licenseTokenId), bidder1);
    }
}
