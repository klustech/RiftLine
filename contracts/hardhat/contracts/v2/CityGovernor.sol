// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {GovernorUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import {GovernorSettingsUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import {GovernorCountingSimpleUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import {GovernorVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import {GovernorVotesQuorumFractionUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import {GovernorTimelockControlUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {IERC5805} from "@openzeppelin/contracts/interfaces/IERC5805.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title CityGovernor
/// @notice Upgradeable modular governor coordinating city-wide proposals.
contract CityGovernor is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    GovernorUpgradeable,
    GovernorSettingsUpgradeable,
    GovernorCountingSimpleUpgradeable,
    GovernorVotesUpgradeable,
    GovernorVotesQuorumFractionUpgradeable,
    GovernorTimelockControlUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct AdditionalVoteSource {
        IERC5805 token;
        uint96 weight;
    }

    AdditionalVoteSource[] private _additionalVoteSources;
    mapping(address => uint256) private _additionalSourceIndex; // token => index+1

    event AdditionalVoteSourceSet(address indexed token, uint96 weight);
    event AdditionalVoteSourceRemoved(address indexed token);

    function initialize(
        address admin,
        ERC20VotesUpgradeable token,
        TimelockControllerUpgradeable timelock,
        uint48 votingDelay_,
        uint32 votingPeriod_,
        uint256 proposalThreshold_,
        uint256 quorumNumerator_
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Governor_init("CityGovernor");
        __GovernorSettings_init(votingDelay_, votingPeriod_, proposalThreshold_);
        __GovernorCountingSimple_init();
        __GovernorVotes_init(token);
        __GovernorVotesQuorumFraction_init(quorumNumerator_);
        __GovernorTimelockControl_init(timelock);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    function additionalVoteSourceCount() external view returns (uint256) {
        return _additionalVoteSources.length;
    }

    function additionalVoteSourceAt(uint256 index) external view returns (address token, uint96 weight) {
        AdditionalVoteSource memory source = _additionalVoteSources[index];
        return (address(source.token), source.weight);
    }

    function setAdditionalVoteSource(IERC5805 token, uint96 weight) external onlyRole(ADMIN_ROLE) {
        require(address(token) != address(0), "token zero");
        require(weight > 0, "weight zero");
        uint256 slot = _additionalSourceIndex[address(token)];
        if (slot == 0) {
            _additionalVoteSources.push(AdditionalVoteSource({token: token, weight: weight}));
            _additionalSourceIndex[address(token)] = _additionalVoteSources.length;
        } else {
            _additionalVoteSources[slot - 1].weight = weight;
        }
        emit AdditionalVoteSourceSet(address(token), weight);
    }

    function removeAdditionalVoteSource(IERC5805 token) external onlyRole(ADMIN_ROLE) {
        uint256 slot = _additionalSourceIndex[address(token)];
        require(slot != 0, "missing");
        uint256 index = slot - 1;
        uint256 lastIndex = _additionalVoteSources.length - 1;
        if (index != lastIndex) {
            AdditionalVoteSource memory last = _additionalVoteSources[lastIndex];
            _additionalVoteSources[index] = last;
            _additionalSourceIndex[address(last.token)] = index + 1;
        }
        _additionalVoteSources.pop();
        delete _additionalSourceIndex[address(token)];
        emit AdditionalVoteSourceRemoved(address(token));
    }

    function updateVotingDelay(uint48 newDelay) external onlyRole(ADMIN_ROLE) {
        _setVotingDelay(newDelay);
    }

    function updateVotingPeriod(uint32 newPeriod) external onlyRole(ADMIN_ROLE) {
        _setVotingPeriod(newPeriod);
    }

    function updateProposalThreshold(uint256 newThreshold) external onlyRole(ADMIN_ROLE) {
        _setProposalThreshold(newThreshold);
    }

    function updateQuorumFraction(uint256 newNumerator) external onlyRole(ADMIN_ROLE) {
        _updateQuorumNumerator(newNumerator);
    }

    // Governor overrides
    function votingDelay()
        public
        view
        override(GovernorUpgradeable, GovernorSettingsUpgradeable)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(GovernorUpgradeable, GovernorSettingsUpgradeable)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 timepoint)
        public
        view
        override(GovernorUpgradeable, GovernorVotesQuorumFractionUpgradeable)
        returns (uint256)
    {
        uint256 baseQuorum = super.quorum(timepoint);
        uint256 numerator = quorumNumerator(timepoint);
        uint256 denominator = quorumDenominator();
        uint256 total = baseQuorum;
        for (uint256 i = 0; i < _additionalVoteSources.length; ++i) {
            AdditionalVoteSource memory source = _additionalVoteSources[i];
            try source.token.getPastTotalSupply(timepoint) returns (uint256 supply) {
                if (supply > 0 && source.weight > 0) {
                    uint256 scaledSupply = Math.mulDiv(supply, uint256(source.weight), 1);
                    total += Math.mulDiv(scaledSupply, numerator, denominator);
                }
            } catch {
                continue;
            }
        }
        return total;
    }

    function proposalThreshold()
        public
        view
        override(GovernorUpgradeable, GovernorSettingsUpgradeable)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _getVotes(address account, uint256 timepoint, bytes memory params)
        internal
        view
        override(GovernorVotesUpgradeable, GovernorUpgradeable)
        returns (uint256)
    {
        uint256 votes = super._getVotes(account, timepoint, params);
        for (uint256 i = 0; i < _additionalVoteSources.length; ++i) {
            AdditionalVoteSource memory source = _additionalVoteSources[i];
            try source.token.getPastVotes(account, timepoint) returns (uint256 extra) {
                if (extra > 0 && source.weight > 0) {
                    votes += Math.mulDiv(extra, uint256(source.weight), 1);
                }
            } catch {
                continue;
            }
        }
        return votes;
    }

    function state(uint256 proposalId)
        public
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 iid)
        public
        view
        override(AccessControlUpgradeable, GovernorUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(iid);
    }

    uint256[45] private __gap;
}
