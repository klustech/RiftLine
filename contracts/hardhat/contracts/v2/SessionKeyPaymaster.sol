// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {_packValidationData} from "@account-abstraction/contracts/core/Helpers.sol";
import {UserOperationLib} from "@account-abstraction/contracts/core/UserOperationLib.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {IPaymaster} from "@account-abstraction/contracts/interfaces/IPaymaster.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {SessionKeyRegistry} from "./SessionKeyRegistry.sol";

/// @title SessionKeyPaymaster
/// @notice ERC-4337 paymaster that validates sponsored sessions against the session key registry.
contract SessionKeyPaymaster is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    IPaymaster
{
    using UserOperationLib for PackedUserOperation;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct PaymasterRequest {
        uint48 validUntil;
        uint48 validAfter;
        address sessionKey;
        bytes32 scope;
        bytes signature;
    }

    IEntryPoint public entryPoint;
    SessionKeyRegistry public sessionRegistry;
    address public verifyingSigner;

    event EntryPointUpdated(address indexed newEntryPoint);
    event SessionRegistryUpdated(address indexed newRegistry);
    event VerifyingSignerUpdated(address indexed newSigner);
    event SponsorshipValidated(bytes32 indexed userOpHash, address indexed account, address indexed sessionKey, bytes32 scope);

    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "not entrypoint");
        _;
    }

    function initialize(address admin, address entryPointAddress, SessionKeyRegistry registry, address signer)
        public
        initializer
    {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _setEntryPoint(entryPointAddress);
        sessionRegistry = registry;
        verifyingSigner = signer;
        emit SessionRegistryUpdated(address(registry));
        emit VerifyingSignerUpdated(signer);
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function setEntryPoint(address entryPointAddress) external onlyRole(ADMIN_ROLE) {
        _setEntryPoint(entryPointAddress);
    }

    function setSessionRegistry(SessionKeyRegistry registry) external onlyRole(ADMIN_ROLE) {
        sessionRegistry = registry;
        emit SessionRegistryUpdated(address(registry));
    }

    function setVerifyingSigner(address signer) external onlyRole(ADMIN_ROLE) {
        verifyingSigner = signer;
        emit VerifyingSignerUpdated(signer);
    }

    function deposit() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    function withdrawDeposit(address payable recipient, uint256 amount) external onlyRole(ADMIN_ROLE) {
        entryPoint.withdrawTo(recipient, amount);
    }

    function addStake(uint32 unstakeDelay) external payable onlyRole(ADMIN_ROLE) {
        entryPoint.addStake{value: msg.value}(unstakeDelay);
    }

    function unlockStake() external onlyRole(ADMIN_ROLE) {
        entryPoint.unlockStake();
    }

    function withdrawStake(address payable recipient) external onlyRole(ADMIN_ROLE) {
        entryPoint.withdrawStake(recipient);
    }

    function getSponsorDigest(
        PackedUserOperation calldata userOp,
        address sessionKey,
        bytes32 scope,
        uint48 validUntil,
        uint48 validAfter
    ) external view returns (bytes32) {
        return _sponsorDigest(userOp, sessionKey, scope, validUntil, validAfter);
    }

    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 /*maxCost*/
    ) external override onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        require(address(sessionRegistry) != address(0), "registry unset");
        require(verifyingSigner != address(0), "signer unset");

        PaymasterRequest memory request = _decodePaymasterData(userOp.paymasterAndData);
        require(request.signature.length >= 64, "signature invalid");

        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(
            _sponsorDigest(userOp, request.sessionKey, request.scope, request.validUntil, request.validAfter)
        );
        address recovered = ECDSA.recover(digest, request.signature);
        if (recovered != verifyingSigner) {
            return ("", _packValidationData(true, request.validUntil, request.validAfter));
        }

        address account = userOp.getSender();
        require(sessionRegistry.isSessionValid(account, request.sessionKey, request.scope), "session invalid");

        context = abi.encode(account, request.sessionKey, request.scope);
        validationData = _packValidationData(false, request.validUntil, request.validAfter);
        emit SponsorshipValidated(userOpHash, account, request.sessionKey, request.scope);
    }

    function postOp(
        PostOpMode,
        bytes calldata context,
        uint256,
        uint256
    ) external override onlyEntryPoint {
        (address account, address sessionKey, bytes32 scope) = abi.decode(context, (address, address, bytes32));
        require(sessionRegistry.consumeSession(account, sessionKey, scope), "session consume failed");
    }

    function _setEntryPoint(address entryPointAddress) internal {
        require(entryPointAddress != address(0), "entrypoint zero");
        entryPoint = IEntryPoint(entryPointAddress);
        emit EntryPointUpdated(entryPointAddress);
    }

    function _sponsorDigest(
        PackedUserOperation calldata userOp,
        address sessionKey,
        bytes32 scope,
        uint48 validUntil,
        uint48 validAfter
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                userOp.getSender(),
                userOp.nonce,
                keccak256(userOp.initCode),
                keccak256(userOp.callData),
                userOp.accountGasLimits,
                userOp.preVerificationGas,
                userOp.gasFees,
                userOp.unpackPaymasterVerificationGasLimit(),
                userOp.unpackPostOpGasLimit(),
                block.chainid,
                address(this),
                sessionKey,
                scope,
                validUntil,
                validAfter
            )
        );
    }

    function _decodePaymasterData(bytes calldata paymasterAndData) internal pure returns (PaymasterRequest memory req) {
        require(paymasterAndData.length >= UserOperationLib.PAYMASTER_DATA_OFFSET, "paymaster data too short");
        bytes calldata data = paymasterAndData[UserOperationLib.PAYMASTER_DATA_OFFSET:];
        (req.validUntil, req.validAfter, req.sessionKey, req.scope, req.signature) =
            abi.decode(data, (uint48, uint48, address, bytes32, bytes));
    }

    uint256[45] private __gap;
}
