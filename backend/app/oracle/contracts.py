import logging

from web3 import AsyncWeb3

from app.common.web3_client import get_account, get_w3, load_abi, send_tx
from app.config import settings

logger = logging.getLogger(__name__)


# --- Legacy BTCMockOracle (kept for backward compat) ---


def get_oracle_contract(w3: AsyncWeb3):
    abi = load_abi("BTCMockOracle", "oracle")
    return w3.eth.contract(
        address=w3.to_checksum_address(settings.oracle_btc_address),
        abi=abi,
    )


async def push_price(price_usd: float) -> str | None:
    """Push BTC price to BTCMockOracle (1e18 scale). Legacy single-asset."""
    if price_usd <= 0:
        logger.warning("Skipping zero price push")
        return None

    w3 = get_w3()
    account = get_account()
    contract = get_oracle_contract(w3)

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


# --- SnowballOracle (multi-asset) ---


def get_snowball_oracle(w3: AsyncWeb3):
    abi = load_abi("SnowballOracle", "integration")
    return w3.eth.contract(
        address=w3.to_checksum_address(settings.oracle_address),
        abi=abi,
    )


async def push_prices(ctc_price_usd: float) -> list[str]:
    """Push multi-asset prices to SnowballOracle.

    Updates wCTC, lstCTC, and sbUSD prices in a single pass.
    lstCTC = wCTC * lstctc_premium (default 1.05).
    sbUSD is always $1.00.
    """
    if ctc_price_usd <= 0:
        logger.warning("Skipping zero price push")
        return []

    w3 = get_w3()
    account = get_account()
    contract = get_snowball_oracle(w3)

    assets = [
        {"name": "wCTC", "address": settings.wctc_address, "price": ctc_price_usd},
        {"name": "lstCTC", "address": settings.lstctc_address, "price": ctc_price_usd * settings.lstctc_premium},
        {"name": "sbUSD", "address": settings.sbusd_address, "price": 1.0},
    ]

    tx_hashes: list[str] = []
    for asset in assets:
        if not asset["address"]:
            continue
        price_1e18 = int(asset["price"] * 1e18)
        addr = w3.to_checksum_address(asset["address"])
        fn = contract.functions.updatePrice(addr, price_1e18)
        tx_hash = await send_tx(w3, fn, account)
        tx_hashes.append(tx_hash)
        logger.info(f"  {asset['name']}: ${asset['price']:.4f} (tx: {tx_hash})")

    logger.info(f"Oracle prices pushed: wCTC=${ctc_price_usd:.4f}, "
                f"lstCTC=${ctc_price_usd * settings.lstctc_premium:.4f}, sbUSD=$1.00")
    return tx_hashes
