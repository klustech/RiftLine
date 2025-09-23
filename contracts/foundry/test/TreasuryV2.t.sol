// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import { TreasuryV2 } from "../src/v2/TreasuryV2.sol";

contract TreasuryV2Test is Test {
  TreasuryV2 internal treasury;

  function setUp() public {
    treasury = new TreasuryV2(address(this));
  }

  function testDepositAndWithdrawEth() public {
    treasury.deposit{ value: 1 ether }(address(0), 1 ether);
    assertEq(treasury.balances(address(0)), 1 ether);

    treasury.withdraw(address(0), 0.25 ether, address(this));
    assertEq(treasury.balances(address(0)), 0.75 ether);

    treasury.withdraw(address(0), 0.75 ether, address(this));
    assertEq(treasury.balances(address(0)), 0);
  }

  function testNonAdminCannotWithdraw() public {
    treasury.deposit{ value: 0.5 ether }(address(0), 0.5 ether);

    vm.expectRevert(bytes("TreasuryV2: not admin"));
    vm.prank(address(0xCAFE));
    treasury.withdraw(address(0), 0.25 ether, address(0xCAFE));
  }
}
