// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract ApartmentNFT is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ERC721Upgradeable, ERC2981Upgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    string private _base;
    uint256 public total;

    struct Apt {
        uint8 tier;
        uint8 garage;
        uint8 storageSlots;
        uint8 perks;
        uint32 price;
    }

    mapping(uint256 => Apt) public aptOf;

    function initialize(address admin, string memory baseURI, address royalty, uint96 bps) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ERC721_init("Rift Apartment", "RAPT");
        __ERC2981_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _base = baseURI;
        _setDefaultRoyalty(royalty, bps);
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function mint(address to, Apt calldata a) external onlyRole(ADMIN_ROLE) returns (uint256 id) {
        id = ++total;
        _safeMint(to, id);
        aptOf[id] = a;
    }

    function setBaseURI(string calldata b) external onlyRole(ADMIN_ROLE) {
        _base = b;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        return string(abi.encodePacked(_base, Strings.toString(id)));
    }

    function supportsInterface(bytes4 iid)
        public
        view
        override(AccessControlUpgradeable, ERC721Upgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(iid);
    }

    uint256[44] private __gap;
}
