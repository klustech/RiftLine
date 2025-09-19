// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title AssetMarketplace
/// @notice Escrow-based marketplace for player-owned ERC721 assets with fee support.
contract AssetMarketplace is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IERC721Receiver
{
    error ERC20CallFailed();

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant LISTING_MANAGER_ROLE = keccak256("LISTING_MANAGER_ROLE");

    struct Listing {
        address seller;
        address asset;
        uint256 tokenId;
        address currency; // address(0) for native payments
        uint96 price;
        uint64 expiry;
        bool active;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    address public feeRecipient;
    uint96 public feeBps; // basis points

    event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed asset, uint256 tokenId, uint96 price);
    event ListingUpdated(uint256 indexed listingId, uint96 newPrice, uint64 newExpiry);
    event ListingCancelled(uint256 indexed listingId);
    event ListingFilled(uint256 indexed listingId, address indexed buyer, uint96 price);
    event FeesUpdated(address indexed recipient, uint96 feeBps);

    function initialize(address admin, address feeRecipient_, uint96 feeBps_) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
        require(feeBps_ <= 10_000, "fee too high");
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function setFees(address recipient, uint96 newFeeBps) external onlyRole(ADMIN_ROLE) {
        require(newFeeBps <= 10_000, "fee too high");
        feeRecipient = recipient;
        feeBps = newFeeBps;
        emit FeesUpdated(recipient, newFeeBps);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function createListing(
        address asset,
        uint256 tokenId,
        address currency,
        uint96 price,
        uint64 expiry
    ) external whenNotPaused nonReentrant returns (uint256 listingId) {
        require(price > 0, "price zero");
        IERC721(asset).safeTransferFrom(msg.sender, address(this), tokenId);
        listingId = ++nextListingId;
        listings[listingId] = Listing({
            seller: msg.sender,
            asset: asset,
            tokenId: tokenId,
            currency: currency,
            price: price,
            expiry: expiry,
            active: true
        });
        emit ListingCreated(listingId, msg.sender, asset, tokenId, price);
    }

    function updateListing(uint256 listingId, uint96 newPrice, uint64 newExpiry) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "inactive");
        require(msg.sender == listing.seller || hasRole(ADMIN_ROLE, msg.sender), "forbidden");
        if (newPrice > 0) {
            listing.price = newPrice;
        }
        listing.expiry = newExpiry;
        emit ListingUpdated(listingId, listing.price, listing.expiry);
    }

    function cancelListing(uint256 listingId) public {
        Listing storage listing = listings[listingId];
        require(listing.active, "inactive");
        require(msg.sender == listing.seller || hasRole(ADMIN_ROLE, msg.sender) || hasRole(LISTING_MANAGER_ROLE, msg.sender),
            "forbidden");
        listing.active = false;
        IERC721(listing.asset).safeTransferFrom(address(this), listing.seller, listing.tokenId);
        emit ListingCancelled(listingId);
    }

    function fillListing(uint256 listingId) external payable whenNotPaused nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "inactive");
        if (listing.expiry != 0) {
            require(block.timestamp <= listing.expiry, "expired");
        }
        listing.active = false;

        uint96 price = listing.price;
        uint256 feeAmount = (price * feeBps) / 10_000;
        uint256 sellerAmount = price - feeAmount;

        if (listing.currency == address(0)) {
            require(msg.value == price, "value mismatch");
            if (feeAmount > 0 && feeRecipient != address(0)) {
                (bool feeOk, ) = feeRecipient.call{value: feeAmount}("");
                require(feeOk, "fee transfer failed");
            }
            (bool ok, ) = listing.seller.call{value: sellerAmount}("");
            require(ok, "payout failed");
        } else {
            require(msg.value == 0, "no value");
            _safeTransferFromERC20(listing.currency, msg.sender, address(this), price);
            if (feeAmount > 0 && feeRecipient != address(0)) {
                _safeTransferERC20(listing.currency, feeRecipient, feeAmount);
            }
            _safeTransferERC20(listing.currency, listing.seller, sellerAmount);
        }

        IERC721(listing.asset).safeTransferFrom(address(this), msg.sender, listing.tokenId);
        emit ListingFilled(listingId, msg.sender, price);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _safeTransferERC20(address token, address to, uint256 value) private {
        if (value == 0) {
            return;
        }
        _callOptionalReturn(token, abi.encodeCall(IERC20.transfer, (to, value)));
    }

    function _safeTransferFromERC20(address token, address from, address to, uint256 value) private {
        if (value == 0) {
            return;
        }
        _callOptionalReturn(token, abi.encodeCall(IERC20.transferFrom, (from, to, value)));
    }

    function _callOptionalReturn(address token, bytes memory data) private {
        (bool success, bytes memory returndata) = token.call(data);
        if (!success || (returndata.length != 0 && !abi.decode(returndata, (bool)))) {
            revert ERC20CallFailed();
        }
    }

    uint256[45] private __gap;
}
