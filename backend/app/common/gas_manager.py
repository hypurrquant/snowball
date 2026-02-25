import logging

from web3 import AsyncWeb3

logger = logging.getLogger(__name__)


async def get_gas_info(w3: AsyncWeb3) -> dict:
    """Get current gas price and block info."""
    gas_price = await w3.eth.gas_price
    block = await w3.eth.get_block("latest")
    return {
        "gas_price_gwei": float(w3.from_wei(gas_price, "gwei")),
        "block_number": block["number"],
        "block_timestamp": block["timestamp"],
    }
