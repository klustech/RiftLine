// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Errors {
    // Access
    error NotAuthorized();
    error InvalidRole();

    // General
    error InvalidParam();
    error AlreadyExists();
    error DoesNotExist();
    error NotActive();
    error NotOwner();
    error TransferDisabled();
    error Underflow();
    error Overflow();

    // Auctions
    error AuctionNotStarted();
    error AuctionEnded();
    error BidTooLow();
    error NoBids();
    error SettlementNotReady();

    // Rentals
    error NotPropertyOwner();
    error LeaseActive();
    error LeaseExpired();

    // Scarcity
    error OverServerCap();
    error ServerUnknown();
}
