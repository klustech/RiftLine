// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721VotesUpgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title PlayerCharacter
/// @notice Dynamic, upgradeable ERC721 that captures a player character's on-chain progression and loadout.
contract PlayerCharacter is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ERC721VotesUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant GAME_SERVER_ROLE = keccak256("GAME_SERVER_ROLE");
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");

    struct Progression {
        uint32 level;
        uint32 experience;
        uint32 reputation;
        uint32 lastActivityAt;
        bytes32 archetype;
        bytes32 homeShard;
    }

    struct AttributeInput {
        bytes32 key;
        int32 value;
    }

    struct LoadoutInput {
        bytes32 slot;
        bytes32 item;
    }

    uint256 private _nextId;
    string private _baseTokenURI;

    mapping(uint256 => Progression) private _progressionOf;
    mapping(uint256 => mapping(bytes32 => int32)) private _attributes;
    mapping(uint256 => mapping(bytes32 => bytes32)) private _equipment;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bytes32) public metadataHashOf;
    mapping(address => uint256) public characterIdOf;

    event CharacterMinted(uint256 indexed tokenId, address indexed account, bytes32 indexed archetype, bytes32 homeShard);
    event CharacterBurned(uint256 indexed tokenId, address indexed account);
    event ProgressionUpdated(
        uint256 indexed tokenId,
        uint32 level,
        uint32 experience,
        uint32 reputation,
        uint32 lastActivityAt,
        bytes32 archetype,
        bytes32 homeShard
    );
    event AttributeSet(uint256 indexed tokenId, bytes32 indexed key, int32 value);
    event EquipmentSet(uint256 indexed tokenId, bytes32 indexed slot, bytes32 itemId);
    event MetadataURISet(uint256 indexed tokenId, string uri, bytes32 metadataHash);
    event BaseURISet(string baseURI);

    function initialize(address admin, string calldata baseURI) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ERC721_init("Rift Player", "RPLYR");
        __EIP712_init("Rift Player", "1");
        __ERC721Votes_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(GAME_SERVER_ROLE, admin);
        _grantRole(METADATA_ROLE, admin);

        _baseTokenURI = baseURI;
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function mint(
        address to,
        Progression calldata initial,
        string calldata tokenURI_,
        bytes32 metadataHash
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(to != address(0), "invalid to");
        require(characterIdOf[to] == 0, "character exists");
        tokenId = ++_nextId;
        _safeMint(to, tokenId);
        _progressionOf[tokenId] = Progression({
            level: initial.level == 0 ? 1 : initial.level,
            experience: initial.experience,
            reputation: initial.reputation,
            lastActivityAt: initial.lastActivityAt,
            archetype: initial.archetype,
            homeShard: initial.homeShard
        });
        if (bytes(tokenURI_).length != 0) {
            _tokenURIs[tokenId] = tokenURI_;
        }
        if (metadataHash != bytes32(0)) {
            metadataHashOf[tokenId] = metadataHash;
        }
        characterIdOf[to] = tokenId;
        emit CharacterMinted(tokenId, to, initial.archetype, initial.homeShard);
        Progression memory p = _progressionOf[tokenId];
        emit ProgressionUpdated(tokenId, p.level, p.experience, p.reputation, p.lastActivityAt, p.archetype, p.homeShard);
        if (bytes(tokenURI_).length != 0 || metadataHash != bytes32(0)) {
            emit MetadataURISet(tokenId, tokenURI_, metadataHash);
        }
    }

    function burn(uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(owner == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "not authorized");
        _burn(tokenId);
        delete _progressionOf[tokenId];
        delete metadataHashOf[tokenId];
        delete _tokenURIs[tokenId];
        emit CharacterBurned(tokenId, owner);
    }

    function syncProgression(uint256 tokenId, Progression calldata updated) external onlyRole(GAME_SERVER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "unknown token");
        _progressionOf[tokenId] = updated;
        emit ProgressionUpdated(
            tokenId,
            updated.level,
            updated.experience,
            updated.reputation,
            updated.lastActivityAt,
            updated.archetype,
            updated.homeShard
        );
    }

    function setAttributes(uint256 tokenId, AttributeInput[] calldata updates) external onlyRole(GAME_SERVER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "unknown token");
        for (uint256 i = 0; i < updates.length; ++i) {
            AttributeInput calldata entry = updates[i];
            _attributes[tokenId][entry.key] = entry.value;
            emit AttributeSet(tokenId, entry.key, entry.value);
        }
    }

    function setLoadout(uint256 tokenId, LoadoutInput[] calldata updates) external onlyRole(GAME_SERVER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "unknown token");
        for (uint256 i = 0; i < updates.length; ++i) {
            LoadoutInput calldata entry = updates[i];
            if (entry.item == bytes32(0)) {
                delete _equipment[tokenId][entry.slot];
            } else {
                _equipment[tokenId][entry.slot] = entry.item;
            }
            emit EquipmentSet(tokenId, entry.slot, entry.item);
        }
    }

    function setMetadataURI(uint256 tokenId, string calldata uri, bytes32 metadataHash)
        external
        onlyRole(METADATA_ROLE)
    {
        require(_ownerOf(tokenId) != address(0), "unknown token");
        _tokenURIs[tokenId] = uri;
        metadataHashOf[tokenId] = metadataHash;
        emit MetadataURISet(tokenId, uri, metadataHash);
    }

    function setBaseURI(string calldata baseURI) external onlyRole(ADMIN_ROLE) {
        _baseTokenURI = baseURI;
        emit BaseURISet(baseURI);
    }

    function progressionOf(uint256 tokenId) external view returns (Progression memory) {
        require(_ownerOf(tokenId) != address(0), "unknown token");
        return _progressionOf[tokenId];
    }

    function attributeOf(uint256 tokenId, bytes32 key) external view returns (int32) {
        require(_ownerOf(tokenId) != address(0), "unknown token");
        return _attributes[tokenId][key];
    }

    function equipmentOf(uint256 tokenId, bytes32 slot) external view returns (bytes32) {
        require(_ownerOf(tokenId) != address(0), "unknown token");
        return _equipment[tokenId][slot];
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721VotesUpgradeable)
        returns (address)
    {
        address from = super._update(to, tokenId, auth);
        if (from != address(0)) {
            characterIdOf[from] = 0;
        }
        if (to != address(0)) {
            require(characterIdOf[to] == 0, "character exists");
            characterIdOf[to] = tokenId;
        }
        return from;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "unknown token");
        string memory custom = _tokenURIs[tokenId];
        if (bytes(custom).length != 0) {
            return custom;
        }
        return string(abi.encodePacked(_baseTokenURI, Strings.toString(tokenId)));
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    uint256[44] private __gap;
}
