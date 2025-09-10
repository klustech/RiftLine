// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {RiftlineToken} from "../token/RiftlineToken.sol";

contract RiftlineGovernor is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction
{
    constructor(RiftlineToken token)
        Governor("RiftlineGovernor")
        GovernorVotes(token)
        GovernorVotesQuorumFraction(4) // 4% quorum; tune
    {}

    function votingDelay() public pure override returns (uint256) { return 6575; } // ~1.5 days
    function votingPeriod() public pure override returns (uint256) { return 46027; } // ~1 week
    function proposalThreshold() public pure override returns (uint256) { return 0; }
}
