// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/ISortedTroves.sol";

/// @title SortedTroves — Doubly-linked list of troves sorted by interest rate
contract SortedTroves is ISortedTroves {
    address public addressesRegistry;
    address public troveManager;
    address public borrowerOperations;

    struct Node {
        bool exists;
        uint256 annualInterestRate;
        uint256 nextId;
        uint256 prevId;
    }

    // Trove ID => Node
    mapping(uint256 => Node) public nodes;
    uint256 public head; // highest interest rate
    uint256 public tail; // lowest interest rate
    uint256 public size;

    address public immutable deployer;
    bool public isInitialized;

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == troveManager || msg.sender == borrowerOperations,
            "SortedTroves: not authorized"
        );
        _;
    }

    function setAddressesRegistry(address _addressesRegistry) external override {
        require(msg.sender == deployer, "SortedTroves: not deployer");
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        addressesRegistry = _addressesRegistry;
    }

    function setAddresses(address _troveManager, address _borrowerOperations) external {
        require(msg.sender == deployer, "SortedTroves: not deployer");
        require(troveManager == address(0), "Already set");
        troveManager = _troveManager;
        borrowerOperations = _borrowerOperations;
    }

    function insert(uint256 _id, uint256 _annualInterestRate, uint256 _prevId, uint256 _nextId) external override onlyAuthorized {
        require(!nodes[_id].exists, "Already exists");

        (uint256 prevId, uint256 nextId) = _findInsertPosition(_annualInterestRate, _prevId, _nextId);

        nodes[_id] = Node({
            exists: true,
            annualInterestRate: _annualInterestRate,
            nextId: nextId,
            prevId: prevId
        });

        if (prevId == 0) {
            head = _id;
        } else {
            nodes[prevId].nextId = _id;
        }

        if (nextId == 0) {
            tail = _id;
        } else {
            nodes[nextId].prevId = _id;
        }

        size++;
    }

    function remove(uint256 _id) external override onlyAuthorized {
        require(nodes[_id].exists, "Not found");

        uint256 prevId = nodes[_id].prevId;
        uint256 nextId = nodes[_id].nextId;

        if (prevId == 0) {
            head = nextId;
        } else {
            nodes[prevId].nextId = nextId;
        }

        if (nextId == 0) {
            tail = prevId;
        } else {
            nodes[nextId].prevId = prevId;
        }

        delete nodes[_id];
        size--;
    }

    function reInsert(uint256 _id, uint256 _newAnnualInterestRate, uint256 _prevId, uint256 _nextId) external override onlyAuthorized {
        require(nodes[_id].exists, "Not found");

        // Remove
        uint256 oldPrev = nodes[_id].prevId;
        uint256 oldNext = nodes[_id].nextId;
        if (oldPrev == 0) head = oldNext;
        else nodes[oldPrev].nextId = oldNext;
        if (oldNext == 0) tail = oldPrev;
        else nodes[oldNext].prevId = oldPrev;

        delete nodes[_id];
        size--;

        // Re-insert
        (uint256 prevId, uint256 nextId) = _findInsertPosition(_newAnnualInterestRate, _prevId, _nextId);

        nodes[_id] = Node({
            exists: true,
            annualInterestRate: _newAnnualInterestRate,
            nextId: nextId,
            prevId: prevId
        });

        if (prevId == 0) head = _id;
        else nodes[prevId].nextId = _id;
        if (nextId == 0) tail = _id;
        else nodes[nextId].prevId = _id;

        size++;
    }

    function contains(uint256 _id) external view override returns (bool) {
        return nodes[_id].exists;
    }

    function isEmpty() external view override returns (bool) {
        return size == 0;
    }

    function getSize() external view override returns (uint256) {
        return size;
    }

    function getFirst() external view override returns (uint256) {
        return head;
    }

    function getLast() external view override returns (uint256) {
        return tail;
    }

    function getNext(uint256 _id) external view override returns (uint256) {
        return nodes[_id].nextId;
    }

    function getPrev(uint256 _id) external view override returns (uint256) {
        return nodes[_id].prevId;
    }

    function findInsertPosition(uint256 _annualInterestRate, uint256 _prevId, uint256 _nextId) external view override returns (uint256, uint256) {
        return _findInsertPosition(_annualInterestRate, _prevId, _nextId);
    }

    function _findInsertPosition(uint256 _annualInterestRate, uint256 _prevId, uint256 _nextId) internal view returns (uint256, uint256) {
        // Simple linear scan — OK for testnet
        if (size == 0) return (0, 0);

        // Valid hint
        if (_prevId != 0 && nodes[_prevId].exists && _nextId != 0 && nodes[_nextId].exists) {
            if (nodes[_prevId].annualInterestRate >= _annualInterestRate &&
                nodes[_nextId].annualInterestRate <= _annualInterestRate) {
                return (_prevId, _nextId);
            }
        }

        // Descending order: head = highest rate
        uint256 current = head;
        uint256 prev = 0;
        while (current != 0 && nodes[current].annualInterestRate > _annualInterestRate) {
            prev = current;
            current = nodes[current].nextId;
        }
        return (prev, current);
    }
}
