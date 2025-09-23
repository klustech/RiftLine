// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract CrossServerGatewayV2 is EIP712 {
  bytes32 public constant TRANSFER_TYPEHASH = keccak256(
    "Transfer(address player,uint256 destinationShard,uint256 nonce)"
  );

  address public immutable relayer;
  mapping(address => uint256) public nonces;

  event TransferFinalized(address indexed player, uint256 destinationShard, uint256 indexed nonce);

  constructor(address _relayer) EIP712("RiftLineGateway", "1") {
    require(_relayer != address(0), "CrossServerGatewayV2: relayer required");
    relayer = _relayer;
  }

  function finalize(address player, uint256 destinationShard, bytes calldata signature) external {
    uint256 nonce = nonces[player];
    bytes32 structHash = keccak256(abi.encode(TRANSFER_TYPEHASH, player, destinationShard, nonce));
    bytes32 digest = _hashTypedDataV4(structHash);
    address signer = ECDSA.recover(digest, signature);
    require(signer == relayer, "CrossServerGatewayV2: invalid signature");

    nonces[player] = nonce + 1;
    emit TransferFinalized(player, destinationShard, nonce);
  }
}
