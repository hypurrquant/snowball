import logging

from eth_account import Account
from eth_account.messages import encode_typed_data

logger = logging.getLogger(__name__)


def verify_order_signature(
    user: str,
    direction: int,
    amount: int,
    round_id: int,
    nonce: int,
    deadline: int,
    signature: str,
    verifying_contract: str,
    chain_id: int,
) -> bool:
    """Verify an EIP-712 signed order off-chain."""
    domain_data = {
        "name": "SnowballOptionsRelayer",
        "version": "1",
        "chainId": chain_id,
        "verifyingContract": verifying_contract,
    }

    message_types = {
        "Order": [
            {"name": "user", "type": "address"},
            {"name": "direction", "type": "uint8"},
            {"name": "amount", "type": "uint256"},
            {"name": "roundId", "type": "uint256"},
            {"name": "nonce", "type": "uint256"},
            {"name": "deadline", "type": "uint256"},
        ]
    }

    message_data = {
        "user": user,
        "direction": direction,
        "amount": amount,
        "roundId": round_id,
        "nonce": nonce,
        "deadline": deadline,
    }

    try:
        signable = encode_typed_data(
            domain_data, message_types, message_data
        )
        recovered = Account.recover_message(signable, signature=bytes.fromhex(signature.removeprefix("0x")))
        return recovered.lower() == user.lower()
    except Exception as e:
        logger.warning(f"Signature verification failed: {e}")
        return False
