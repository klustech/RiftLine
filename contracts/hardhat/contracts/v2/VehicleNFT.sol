// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract VehicleNFT is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ERC721Upgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    string private _base;
    uint256 public total;

    struct Specs {
        uint16 maxKph;
        uint16 accelMs;
        uint16 handling;
        uint16 fuel;
        uint8 seats;
        uint8 vclass;
        uint8 armor;
        uint8 flags;
        uint32 price;
    }

    mapping(uint256 => Specs) public specsOf;

    function initialize(address admin, string memory baseURI) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ERC721_init("Rift Vehicle", "RVHL");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _base = baseURI;
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function mint(address to, Specs calldata s) external onlyRole(ADMIN_ROLE) returns (uint256 id) {
        id = ++total;
        _safeMint(to, id);
        specsOf[id] = s;
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
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(iid);
    }

    uint256[45] private __gap;
}
