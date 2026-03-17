// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.24;

// Snowball Public Allocator -- fork of Morpho PublicAllocator (GPL-2.0)

/**
 * @title PublicAllocator
 * @notice Allows anyone to reallocate SnowballVault liquidity across markets,
 *         subject to per-market flow caps set by the vault's allocator.
 */
contract PublicAllocator {
    address public immutable snowballLend;

    struct FlowCap {
        uint128 maxIn;
        uint128 maxOut;
    }

    /// @notice vault => market => flow cap
    mapping(address => mapping(bytes32 => FlowCap)) public flowCaps;

    event SetFlowCaps(address indexed vault, bytes32 indexed id, uint128 maxIn, uint128 maxOut);
    event PublicReallocation(address indexed vault, bytes32 indexed from, bytes32 indexed to, uint256 assets);

    constructor(address _snowballLend) {
        snowballLend = _snowballLend;
    }

    function setFlowCaps(address vault, bytes32 id, uint128 maxIn, uint128 maxOut) external {
        // Only vault's allocator or owner may set caps (simplified: no auth check for stub)
        flowCaps[vault][id] = FlowCap(maxIn, maxOut);
        emit SetFlowCaps(vault, id, maxIn, maxOut);
    }

    function reallocate(
        address vault,
        bytes32 fromMarket,
        bytes32 toMarket,
        uint256 assets
    ) external {
        FlowCap storage capFrom = flowCaps[vault][fromMarket];
        FlowCap storage capTo = flowCaps[vault][toMarket];
        require(assets <= capFrom.maxOut, "PublicAllocator: exceeds maxOut");
        require(assets <= capTo.maxIn, "PublicAllocator: exceeds maxIn");
        capFrom.maxOut -= uint128(assets);
        capTo.maxIn -= uint128(assets);
        emit PublicReallocation(vault, fromMarket, toMarket, assets);
    }
}
