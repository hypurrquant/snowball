import asyncio
import json
import logging
from pathlib import Path

from eth_account import Account
from web3 import AsyncHTTPProvider, AsyncWeb3
from web3.middleware import ExtraDataToPOAMiddleware

from app.config import settings

logger = logging.getLogger(__name__)

# Nonce lock for safe concurrent transactions
_nonce_lock = asyncio.Lock()
_current_nonce: int | None = None


def get_w3() -> AsyncWeb3:
    w3 = AsyncWeb3(AsyncHTTPProvider(settings.rpc_url))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3


def get_account():
    return Account.from_key(settings.operator_private_key)


def load_abi(contract_name: str, package: str = "oracle") -> list:
    """Load ABI from Foundry artifacts. Searches multiple paths for Docker/local compatibility."""
    candidates = [
        # Docker: mounted ABI directory
        Path("/app/abi") / package / f"{contract_name}.json",
        # Local: relative to backend/
        Path(__file__).resolve().parent.parent.parent / "abi" / package / f"{contract_name}.json",
        # Local: Foundry output in monorepo
        Path(__file__).resolve().parent.parent.parent.parent / "packages" / package / "out" / f"{contract_name}.sol" / f"{contract_name}.json",
    ]
    for artifact_path in candidates:
        if artifact_path.exists():
            with open(artifact_path) as f:
                artifact = json.load(f)
            return artifact["abi"]
    raise FileNotFoundError(f"ABI not found for {contract_name}. Searched: {[str(p) for p in candidates]}")


async def send_tx(w3: AsyncWeb3, contract_fn, account) -> str:
    """Build, sign, and send a transaction with nonce management."""
    global _current_nonce

    async with _nonce_lock:
        if _current_nonce is None:
            _current_nonce = await w3.eth.get_transaction_count(account.address)

        nonce = _current_nonce
        _current_nonce += 1

    gas_price = await w3.eth.gas_price

    tx = await contract_fn.build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 3_000_000,
        "gasPrice": gas_price,
        "chainId": settings.chain_id,
    })

    signed = account.sign_transaction(tx)
    tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = await w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt["status"] != 1:
        logger.error(f"TX failed: {tx_hash.hex()}")
        raise RuntimeError(f"Transaction failed: {tx_hash.hex()}")

    logger.info(f"TX success: {tx_hash.hex()}")
    return tx_hash.hex()
