// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library TokenLib {
    function safeTransferETH(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "ETH xfer failed");
    }

    function safeTransferERC20(IERC20 token, address to, uint256 amount) internal {
        require(token.transfer(to, amount), "ERC20 xfer failed");
    }
}
