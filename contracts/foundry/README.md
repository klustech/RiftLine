# RiftLine Foundry Suite

This package contains fuzz/property tests that exercise the RiftLine on-chain stack.

## Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed (`forge`, `cast`).
- The Hardhat contracts compiled (to provide dependencies).

## Running locally
```
cd contracts/foundry
forge install
forge test -vv
```

## Tests
- `RentAuctionFuzz.t.sol` — validates auction invariants (monotonic bids, settlement gating).
- `TreasuryFuzz.t.sol` — checks deposit/withdraw accounting and role restrictions.

Feel free to extend with additional invariants or integrate live deployment addresses via `--fork-url` when needed.
