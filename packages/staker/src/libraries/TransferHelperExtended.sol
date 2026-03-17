// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.0;

import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@openzeppelin/contracts/utils/Address.sol';

library TransferHelperExtended {
    using Address for address;

    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        require(token.isContract(), 'TransferHelperExtended: call to non-contract');
        TransferHelper.safeTransferFrom(token, from, to, value);
    }

    function safeTransfer(
        address token,
        address to,
        uint256 value
    ) internal {
        require(token.isContract(), 'TransferHelperExtended: call to non-contract');
        TransferHelper.safeTransfer(token, to, value);
    }
}
