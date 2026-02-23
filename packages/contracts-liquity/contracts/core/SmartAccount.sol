// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/ISmartAccount.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

/**
 * @title SmartAccount
 * @notice Minimal smart account that acts as trove owner.
 *         The owner and authorized agents can execute arbitrary calls through it,
 *         allowing the agent backend to call BorrowerOperations with msg.sender = SmartAccount.
 */
contract SmartAccount is ISmartAccount, IERC721Receiver {
    address public immutable override owner;
    mapping(address => bool) public override authorized;

    bool private _locked;

    modifier onlyOwner() {
        require(msg.sender == owner, "SmartAccount: not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || authorized[msg.sender], "SmartAccount: not authorized");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "SmartAccount: reentrant");
        _locked = true;
        _;
        _locked = false;
    }

    constructor(address _owner) {
        require(_owner != address(0), "SmartAccount: zero owner");
        owner = _owner;
    }

    // ─── Agent management ───

    function addAgent(address agent) external override onlyOwner {
        require(agent != address(0), "SmartAccount: zero agent");
        require(!authorized[agent], "SmartAccount: already authorized");
        authorized[agent] = true;
        emit AgentAdded(agent);
    }

    function removeAgent(address agent) external override onlyOwner {
        require(authorized[agent], "SmartAccount: not authorized");
        authorized[agent] = false;
        emit AgentRemoved(agent);
    }

    // ─── Execution ───

    function execute(
        address target,
        bytes calldata data
    ) external payable override onlyAuthorized nonReentrant returns (bytes memory) {
        (bool success, bytes memory result) = target.call{value: msg.value}(data);
        if (!success) {
            revert(_getRevertMsg(result));
        }
        emit Executed(target, data, result);
        return result;
    }

    function executeBatch(
        address[] calldata targets,
        bytes[] calldata data
    ) external payable override onlyAuthorized nonReentrant returns (bytes[] memory) {
        require(targets.length == data.length, "SmartAccount: length mismatch");
        bytes[] memory results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call(data[i]);
            if (!success) {
                revert(_getRevertMsg(result));
            }
            results[i] = result;
            emit Executed(targets[i], data[i], result);
        }
        return results;
    }

    // ─── Withdrawals ───

    function withdrawETH(address payable to, uint256 amount) external override onlyOwner {
        require(to != address(0), "SmartAccount: zero address");
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "SmartAccount: ETH transfer failed");
    }

    function withdrawERC20(address token, address to, uint256 amount) external override onlyOwner {
        require(to != address(0), "SmartAccount: zero address");
        bool success = IERC20(token).transfer(to, amount);
        require(success, "SmartAccount: ERC20 transfer failed");
    }

    // ─── ERC721 receiver (for TroveNFT) ───

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ─── Receive ETH ───

    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    // ─── Internal ───

    function _getRevertMsg(bytes memory returnData) internal pure returns (string memory) {
        if (returnData.length < 68) return "SmartAccount: call reverted";
        assembly {
            returnData := add(returnData, 0x04)
        }
        return abi.decode(returnData, (string));
    }
}
