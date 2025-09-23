// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import { CrossServerGatewayV2 } from "../src/v2/CrossServerGatewayV2.sol";

contract CrossServerGatewayV2Test is Test {
  CrossServerGatewayV2 internal gateway;
  uint256 internal relayerPk;
  address internal relayer;

  function setUp() public {
    relayerPk = 0xA11CE;
    relayer = vm.addr(relayerPk);
    gateway = new CrossServerGatewayV2(relayer);
  }

  function _domainSeparator() internal view returns (bytes32) {
    return keccak256(
      abi.encode(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256(bytes("RiftLineGateway")),
        keccak256(bytes("1")),
        block.chainid,
        address(gateway)
      )
    );
  }

  function _signTransfer(address player, uint256 shard, uint256 nonce, uint256 pk)
    internal
    view
    returns (bytes memory)
  {
    bytes32 structHash = keccak256(abi.encode(gateway.TRANSFER_TYPEHASH(), player, shard, nonce));
    bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
    return abi.encodePacked(r, s, v);
  }

  function testFinalizeAdvancesNonce() public {
    address player = address(0xBEEF);
    uint256 shard = 7;
    bytes memory signature = _signTransfer(player, shard, gateway.nonces(player), relayerPk);

    gateway.finalize(player, shard, signature);

    assertEq(gateway.nonces(player), 1);
  }

  function testInvalidSignatureReverts() public {
    address player = address(0xBEEF);
    uint256 shard = 2;
    bytes memory wrongSig = _signTransfer(player, shard, gateway.nonces(player), 0xDEADBEEF);

    vm.expectRevert(bytes("CrossServerGatewayV2: invalid signature"));
    gateway.finalize(player, shard, wrongSig);
  }
}
