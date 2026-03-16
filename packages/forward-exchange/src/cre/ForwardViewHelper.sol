// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IForward} from "../interfaces/IForward.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title ForwardViewHelper
/// @notice Batch-read helper for CRE workflows to minimize chain read calls
/// @dev Pure view contract, no state, no owner — deploy once and forget
contract ForwardViewHelper {
    struct MaturedPosition {
        uint256 longId;
        bytes32 marketId;
        uint256 notional;
        int256 forwardRate;
        address longOwner;
        address shortOwner;
    }

    /// @notice Returns matured, unsettled, matched positions up to an optional cap
    /// @param forward The Forward contract address
    /// @param maxId   Upper bound on pair IDs to scan (inclusive). Pass 0 to scan all.
    /// @return positions Array of matured positions ready for settlement
    function getMaturedPositions(address forward, uint256 maxId) external view returns (MaturedPosition[] memory positions) {
        IForward fwd = IForward(forward);
        IERC721 nft = IERC721(forward);

        // First pass: count matured positions
        uint256 nextPairId = _getNextPairId(forward);
        if (maxId != 0 && maxId < nextPairId) nextPairId = maxId + 1;
        uint256 count;

        for (uint256 id = 2; id < nextPairId; id += 2) {
            IForward.ForwardPosition memory pos = fwd.getPosition(id);
            if (_isSettleable(pos)) count++;
        }

        // Second pass: populate array
        positions = new MaturedPosition[](count);
        uint256 idx;

        for (uint256 id = 2; id < nextPairId; id += 2) {
            IForward.ForwardPosition memory pos = fwd.getPosition(id);
            if (!_isSettleable(pos)) continue;

            positions[idx] = MaturedPosition({
                longId: id,
                marketId: pos.marketId,
                notional: pos.notional,
                forwardRate: pos.forwardRate,
                longOwner: nft.ownerOf(id),
                shortOwner: nft.ownerOf(id + 1)
            });
            idx++;
        }
    }

    function _isSettleable(IForward.ForwardPosition memory pos) internal view returns (bool) {
        return pos.notional > 0
            && !pos.settled
            && pos.counterparty != address(0)
            && block.timestamp >= pos.maturityTime;
    }

    function _getNextPairId(address forward) internal view returns (uint256) {
        // Forward.nextPairId() is public but not in IForward
        (bool ok, bytes memory data) = forward.staticcall(abi.encodeWithSignature("nextPairId()"));
        require(ok, "nextPairId failed");
        return abi.decode(data, (uint256));
    }
}
