// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Treasury} from "../treasury/Treasury.sol";
import {Errors} from "../errors/Errors.sol";

/// @title Marketplace
/// @notice Simple fixed-price listings for Apartments (ERC721) and Items (ERC1155).
contract Marketplace is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    Treasury public immutable treasury;
    uint16 public feeBps; // e.g. 250 = 2.5%

    struct Listing721 {
        address nft;
        uint256 tokenId;
        address seller;
        address payToken; // 0 = ETH
        uint256 price;
        bool active;
    }

    struct Listing1155 {
        address nft;
        uint256 id;
        address seller;
        address payToken;
        uint256 price;
        uint256 amount;
        bool active;
    }

    mapping(bytes32 => Listing721)  public listings721;  // key = keccak(nft,tokenId)
    mapping(bytes32 => Listing1155) public listings1155; // key = keccak(nft,id,seller)

    event Listed721(address indexed nft, uint256 indexed tokenId, address seller, uint256 price, address payToken);
    event Sold721(address indexed nft, uint256 indexed tokenId, address buyer, uint256 price);
    event Listed1155(address indexed nft, uint256 indexed id, address seller, uint256 amount, uint256 price, address payToken);
    event Sold1155(address indexed nft, uint256 indexed id, address buyer, uint256 amount, uint256 price);

    constructor(address admin, Treasury _treasury, uint16 _feeBps) {
        treasury = _treasury;
        feeBps = _feeBps;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    function setFee(uint16 _bps) external onlyRole(ADMIN_ROLE) { require(_bps <= 1000, "fee too high"); feeBps = _bps; }

    // --- ERC721 ---
    function list721(address nft, uint256 tokenId, address payToken, uint256 price) external {
        bytes32 key = keccak256(abi.encodePacked(nft, tokenId));
        if (listings721[key].active) revert Errors.AlreadyExists();
        if (IERC721(nft).ownerOf(tokenId) != msg.sender) revert Errors.NotOwner();
        listings721[key] = Listing721(nft, tokenId, msg.sender, payToken, price, true);
        emit Listed721(nft, tokenId, msg.sender, price, payToken);
    }

    function buy721(address nft, uint256 tokenId, uint256 amount) external payable nonReentrant {
        bytes32 key = keccak256(abi.encodePacked(nft, tokenId));
        Listing721 storage l = listings721[key];
        if (!l.active) revert Errors.DoesNotExist();
        if (amount != l.price) revert Errors.InvalidParam();

        _takePayment(l.payToken, amount);
        _payout(l.payToken, l.seller, amount - (amount * feeBps / 10_000));
        _payout(l.payToken, address(treasury), (amount * feeBps / 10_000));

        IERC721(nft).safeTransferFrom(l.seller, msg.sender, tokenId);
        l.active = false;
        emit Sold721(nft, tokenId, msg.sender, amount);
    }

    // --- ERC1155 ---
    function list1155(address nft, uint256 id, uint256 amount, address payToken, uint256 price) external {
        if (amount == 0) revert Errors.InvalidParam();
        bytes32 key = keccak256(abi.encodePacked(nft, id, msg.sender));
        if (listings1155[key].active) revert Errors.AlreadyExists();
        listings1155[key] = Listing1155(nft, id, msg.sender, payToken, price, amount, true);
        emit Listed1155(nft, id, msg.sender, amount, price, payToken);
    }

    function buy1155(address nft, uint256 id, address seller, uint256 amount, uint256 totalPrice) external payable nonReentrant {
        bytes32 key = keccak256(abi.encodePacked(nft, id, seller));
        Listing1155 storage l = listings1155[key];
        if (!l.active || amount == 0 || amount > l.amount) revert Errors.InvalidParam();
        if (totalPrice != (l.price * amount)) revert Errors.InvalidParam();

        _takePayment(l.payToken, totalPrice);
        _payout(l.payToken, l.seller, totalPrice - (totalPrice * feeBps / 10_000));
        _payout(l.payToken, address(treasury), (totalPrice * feeBps / 10_000));

        IERC1155(nft).safeTransferFrom(l.seller, msg.sender, id, amount, "");
        l.amount -= amount;
        if (l.amount == 0) l.active = false;
        emit Sold1155(nft, id, msg.sender, amount, totalPrice);
    }

    // --- pay helpers ---
    function _takePayment(address payToken, uint256 amount) internal {
        if (payToken == address(0)) {
            if (msg.value != amount) revert Errors.InvalidParam();
        } else {
            IERC20(payToken).transferFrom(msg.sender, address(this), amount);
        }
    }
    function _payout(address payToken, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (payToken == address(0)) {
            (bool ok,) = to.call{value: amount}(""); require(ok, "ETH xfer fail");
        } else {
            IERC20(payToken).transfer(to, amount);
        }
    }

    receive() external payable {}
}
