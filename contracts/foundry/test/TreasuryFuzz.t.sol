// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {RiftToken} from "contracts/v2/RiftToken.sol";
import {Treasury} from "contracts/v2/Treasury.sol";

contract TreasuryFuzz is Test {
    RiftToken internal token;
    Treasury internal treasury;
    address internal recipient = address(0xCAFE);
    bytes32 internal constant STREAM_KEY = keccak256("rifttest");

    function setUp() public {
        token = new RiftToken();
        token.initialize(address(this));
        token.grantRole(token.MINTER_ROLE(), address(this));

        treasury = new Treasury();
        treasury.initialize(address(this), token);
        treasury.grantRole(treasury.EMITTER_ROLE(), address(this));

        token.mint(address(treasury), 10_000 ether);
        treasury.setStream(STREAM_KEY, recipient, 1 ether, true);
    }

    function testFuzz_StreamAccrual(uint96 ratePerHour, uint64 hoursElapsed) public {
        ratePerHour = uint96(bound(ratePerHour, 1e16, 10 ether));
        hoursElapsed = uint64(bound(hoursElapsed, 1, 72));

        treasury.setStream(STREAM_KEY, recipient, ratePerHour, true);
        uint256 balanceBefore = token.balanceOf(recipient);

        vm.warp(block.timestamp + hoursElapsed * 1 hours);
        treasury.accrueAndPay(STREAM_KEY);

        uint256 expected = uint256(ratePerHour) * hoursElapsed;
        assertEq(token.balanceOf(recipient), balanceBefore + expected);
    }

    function test_RevertWhenCallerUnauthorized() public {
        treasury.setStream(STREAM_KEY, recipient, 1 ether, true);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        treasury.accrueAndPay(STREAM_KEY);
    }
}
