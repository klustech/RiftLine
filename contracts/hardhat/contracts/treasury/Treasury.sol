// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {TokenLib} from "../libraries/TokenLib.sol";

/// @title Riftline Treasury
/// @notice Fee sink and payout hub.
contract Treasury is AccessControl, ReentrancyGuard {
    using TokenLib for IERC20;

    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE");
    bytes32 public constant PAYOUT_ROLE  = keccak256("PAYOUT_ROLE");

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    receive() external payable {}

    function withdrawETH(address to, uint256 amount) external onlyRole(PAYOUT_ROLE) nonReentrant {
        TokenLib.safeTransferETH(to, amount);
    }

    function withdrawERC20(IERC20 token, address to, uint256 amount) external onlyRole(PAYOUT_ROLE) nonReentrant {
        token.safeTransferERC20(to, amount);
    }
}
