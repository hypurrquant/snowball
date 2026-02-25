// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ISnowballOptions} from "./interfaces/ISnowballOptions.sol";

/// @title OptionsRelayer
/// @notice EIP-712 signature verification + batch order submission
contract OptionsRelayer is
    Initializable,
    UUPSUpgradeable
{
    using ECDSA for bytes32;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 domain
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant ORDER_TYPEHASH =
        keccak256("Order(address user,uint8 direction,uint256 amount,uint256 roundId,uint256 nonce,uint256 deadline)");

    bytes32 public DOMAIN_SEPARATOR;

    ISnowballOptions public options;
    address public clearingHouse;

    mapping(address => uint256) public nonces;

    address private _admin;
    mapping(bytes32 => mapping(address => bool)) private _roles;

    struct SignedOrder {
        address user;
        uint8 direction; // 0 = Over, 1 = Under
        uint256 amount;
        uint256 roundId;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }

    event OrdersRelayed(uint256 indexed roundId, uint256 count);
    event OrderRejected(address indexed user, string reason);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address _options,
        address _clearingHouse
    ) external initializer {
        _admin = admin;
        _roles[OPERATOR_ROLE][admin] = true;
        options = ISnowballOptions(_options);
        clearingHouse = _clearingHouse;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256("SnowballOptionsRelayer"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "Relayer: unauthorized");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == _admin, "Relayer: not admin");
        _;
    }

    function grantRole(bytes32 role, address account) external onlyAdmin {
        _roles[role][account] = true;
    }

    function revokeRole(bytes32 role, address account) external onlyAdmin {
        _roles[role][account] = false;
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    /// @notice Submit matched signed orders in batch
    /// @param overOrders Array of signed Over orders
    /// @param underOrders Array of signed Under orders (matched 1:1)
    function submitSignedOrders(
        SignedOrder[] calldata overOrders,
        SignedOrder[] calldata underOrders
    ) external onlyRole(OPERATOR_ROLE) {
        require(overOrders.length == underOrders.length, "Relayer: length mismatch");
        require(overOrders.length > 0, "Relayer: empty batch");

        uint256 roundId = overOrders[0].roundId;

        address[] memory overUsers = new address[](overOrders.length);
        address[] memory underUsers = new address[](underOrders.length);
        uint256[] memory amounts = new uint256[](overOrders.length);

        uint256 validCount = 0;

        for (uint256 i = 0; i < overOrders.length; i++) {
            SignedOrder calldata over = overOrders[i];
            SignedOrder calldata under = underOrders[i];

            // Validate pair
            require(over.roundId == roundId && under.roundId == roundId, "Relayer: round mismatch");
            require(over.direction == 0, "Relayer: over direction invalid");
            require(under.direction == 1, "Relayer: under direction invalid");
            require(over.amount == under.amount, "Relayer: amount mismatch");

            // Verify signatures
            if (!_verifySignature(over) || !_verifySignature(under)) {
                continue; // skip invalid signatures
            }

            // Check deadlines
            if (block.timestamp > over.deadline || block.timestamp > under.deadline) {
                continue; // skip expired orders
            }

            // Consume nonces
            nonces[over.user]++;
            nonces[under.user]++;

            overUsers[validCount] = over.user;
            underUsers[validCount] = under.user;
            amounts[validCount] = over.amount;
            validCount++;
        }

        if (validCount > 0) {
            // Trim arrays
            assembly {
                mstore(overUsers, validCount)
                mstore(underUsers, validCount)
                mstore(amounts, validCount)
            }

            options.submitFilledOrders(roundId, overUsers, underUsers, amounts);
            emit OrdersRelayed(roundId, validCount);
        }
    }

    function _verifySignature(SignedOrder calldata order) internal view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                ORDER_TYPEHASH,
                order.user,
                order.direction,
                order.amount,
                order.roundId,
                order.nonce,
                order.deadline
            )
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(DOMAIN_SEPARATOR, structHash);
        address signer = ECDSA.recover(digest, order.signature);

        return signer == order.user && order.nonce == nonces[order.user];
    }

    function getDigest(
        address user,
        uint8 direction,
        uint256 amount,
        uint256 roundId,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(ORDER_TYPEHASH, user, direction, amount, roundId, nonce, deadline)
        );
        return MessageHashUtils.toTypedDataHash(DOMAIN_SEPARATOR, structHash);
    }

    // ─── UUPS ───

    function _authorizeUpgrade(address) internal view override {
        require(msg.sender == _admin, "Relayer: not admin");
    }
}
