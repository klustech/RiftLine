// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import { RentAuctionV2 } from "../src/v2/RentAuctionV2.sol";

contract RentAuctionV2Test is Test {
  RentAuctionV2 internal auction;

  event AuctionCancelled(uint256 indexed auctionId);

  function setUp() public {
    auction = new RentAuctionV2(address(this));
  }

  function testCancelMarksAuction() public {
    vm.expectEmit(true, false, false, true);
    emit AuctionCancelled(1);
    auction.cancel(1);

    assertTrue(auction.isCancelled(1));
  }

  function testNonAdminCannotCancel() public {
    vm.expectRevert(bytes("RentAuctionV2: not admin"));
    vm.prank(address(0xBEEF));
    auction.cancel(99);
  }
}
