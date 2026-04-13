// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SLAEscrow {
    struct SLA {
        address provider;
        address consumer;
        address token;
        uint256 amount;
        uint256 penaltyPercent;
        uint256 maxLatencyMs;
        uint256 minUptimePercent;
        uint256 startTime;
        uint256 endTime;
        bool settled;
        bool penalized;
        bool funded;
    }

    mapping(bytes32 => SLA) public slas;

    event SLACreated(bytes32 indexed slaId, address provider, address consumer, uint256 amount);
    event SLAFunded(bytes32 indexed slaId, uint256 amount);
    event SLASettled(bytes32 indexed slaId, bool penalized, uint256 providerAmount);

    function createSLA(
        address provider,
        address token,
        uint256 amount,
        uint256 penaltyPercent,
        uint256 maxLatencyMs,
        uint256 minUptimePercent,
        uint256 durationSeconds
    ) external returns (bytes32 slaId) {
        require(penaltyPercent <= 100, "Penalty max 100%");
        slaId = keccak256(abi.encodePacked(
            provider, msg.sender, block.timestamp, amount
        ));
        slas[slaId] = SLA({
            provider: provider,
            consumer: msg.sender,
            token: token,
            amount: amount,
            penaltyPercent: penaltyPercent,
            maxLatencyMs: maxLatencyMs,
            minUptimePercent: minUptimePercent,
            startTime: block.timestamp,
            endTime: block.timestamp + durationSeconds,
            settled: false,
            penalized: false,
            funded: false
        });
        emit SLACreated(slaId, provider, msg.sender, amount);
    }

    function depositFunds(bytes32 slaId) external {
        SLA storage sla = slas[slaId];
        require(msg.sender == sla.consumer, "Solo el consumer");
        require(!sla.funded, "Ya financiado");
        require(!sla.settled, "Ya liquidado");
        IERC20(sla.token).transferFrom(msg.sender, address(this), sla.amount);
        sla.funded = true;
        emit SLAFunded(slaId, sla.amount);
    }

    function releaseFunds(bytes32 slaId) external {
        SLA storage sla = slas[slaId];
        require(sla.funded, "No financiado");
        require(block.timestamp >= sla.endTime, "SLA aun activo");
        require(!sla.settled, "Ya liquidado");
        sla.settled = true;
        IERC20(sla.token).transfer(sla.provider, sla.amount);
        emit SLASettled(slaId, false, sla.amount);
    }

    function penalize(bytes32 slaId) external {
        SLA storage sla = slas[slaId];
        require(sla.funded, "No financiado");
        require(block.timestamp >= sla.endTime, "SLA aun activo");
        require(!sla.settled, "Ya liquidado");
        sla.settled = true;
        sla.penalized = true;
        uint256 penaltyAmount = (sla.amount * sla.penaltyPercent) / 100;
        uint256 providerAmount = sla.amount - penaltyAmount;
        IERC20(sla.token).transfer(sla.provider, providerAmount);
        IERC20(sla.token).transfer(sla.consumer, penaltyAmount);
        emit SLASettled(slaId, true, providerAmount);
    }

    function getSLA(bytes32 slaId) external view returns (SLA memory) {
        return slas[slaId];
    }
}