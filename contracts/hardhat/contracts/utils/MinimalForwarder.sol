// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MinimalForwarder as OZForwarder} from "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

/// @dev OZ’s audited forwarder for gasless meta-transactions.
contract MinimalForwarder is OZForwarder {}
