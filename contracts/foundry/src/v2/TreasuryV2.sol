// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TreasuryV2 {
  address public immutable admin;
  mapping(address => uint256) public balances;

  modifier onlyAdmin() {
    require(msg.sender == admin, "TreasuryV2: not admin");
    _;
  }

  constructor(address _admin) {
    require(_admin != address(0), "TreasuryV2: admin required");
    admin = _admin;
  }

  function deposit(address token, uint256 amount) external payable {
    if (token == address(0)) {
      require(msg.value == amount, "TreasuryV2: inconsistent value");
      balances[address(0)] += amount;
    } else {
      require(msg.value == 0, "TreasuryV2: unexpected value");
      IERC20(token).transferFrom(msg.sender, address(this), amount);
      balances[token] += amount;
    }
  }

  function withdraw(address token, uint256 amount, address to) external onlyAdmin {
    require(to != address(0), "TreasuryV2: invalid recipient");
    require(balances[token] >= amount, "TreasuryV2: insufficient balance");

    balances[token] -= amount;

    if (token == address(0)) {
      (bool ok, ) = to.call{ value: amount }("");
      require(ok, "TreasuryV2: ETH transfer failed");
    } else {
      IERC20(token).transfer(to, amount);
    }
  }
}
