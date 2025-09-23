// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRentAuctionV2 {
  event AuctionCancelled(uint256 indexed auctionId);

  function cancel(uint256 auctionId) external;
  function isCancelled(uint256 auctionId) external view returns (bool);
}

contract RentAuctionV2 is IRentAuctionV2 {
  address public immutable admin;
  mapping(uint256 => bool) private _cancelled;

  modifier onlyAdmin() {
    require(msg.sender == admin, "RentAuctionV2: not admin");
    _;
  }

  constructor(address _admin) {
    require(_admin != address(0), "RentAuctionV2: admin required");
    admin = _admin;
  }

  function cancel(uint256 auctionId) external onlyAdmin {
    require(!_cancelled[auctionId], "RentAuctionV2: already cancelled");
    _cancelled[auctionId] = true;
    emit AuctionCancelled(auctionId);
  }

  function isCancelled(uint256 auctionId) external view override returns (bool) {
    return _cancelled[auctionId];
  }
}
