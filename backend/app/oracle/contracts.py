import logging

from web3 import AsyncWeb3

from app.common.web3_client import get_account, get_w3, load_abi, send_tx
from app.config import settings

logger = logging.getLogger(__name__)


def get_oracle_contract(w3: AsyncWeb3):
    abi = load_abi("BTCMockOracle", "oracle")
    return w3.eth.contract(
        address=w3.to_checksum_address(settings.oracle_btc_address),
        abi=abi,
    )


async def push_price(price_usd: float) -> str | None:
    """Push BTC price to BTCMockOracle (1e18 scale)."""
    if price_usd <= 0:
        logger.warning("Skipping zero price push")
        return None

    w3 = get_w3()
    account = get_account()
    contract = get_oracle_contract(w3)

    # Convert to 1e18 scale
    price_1e18 = int(price_usd * 1e18)

    fn = contract.functions.updatePrice(price_1e18)
    tx_hash = await send_tx(w3, fn, account)
    logger.info(f"Oracle price pushed: ${price_usd:,.2f} -> {price_1e18} (tx: {tx_hash})")
    return tx_hash


async def fetch_price() -> tuple[int, bool]:
    """Read current price from oracle contract."""
    w3 = get_w3()
    contract = get_oracle_contract(w3)
    price, is_fresh = await contract.functions.fetchPrice().call()
    return price, is_fresh
