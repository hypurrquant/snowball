import asyncio
import logging

from app.config import settings
from app.oracle.contracts import push_price, push_prices
from app.oracle.sources import binance_ws_feed, coingecko_fallback, get_latest_price

logger = logging.getLogger(__name__)


async def oracle_push_loop():
    """Background task: push prices to oracle every N seconds.

    Supports two modes:
    - SnowballOracle (multi-asset): when oracle_address is set
    - BTCMockOracle (legacy): when only oracle_btc_address is set
    """
    use_snowball = bool(settings.oracle_address)
    mode = "SnowballOracle" if use_snowball else "BTCMockOracle"
    logger.info(f"Oracle push loop started (mode={mode}, interval={settings.oracle_push_interval}s)")

    while True:
        try:
            # Use override price for testnet, or live feed
            if settings.ctc_price_override > 0:
                price = settings.ctc_price_override
            else:
                price = get_latest_price()
                if price <= 0:
                    price = await coingecko_fallback()

            if price > 0:
                if use_snowball:
                    await push_prices(price)
                else:
                    await push_price(price)
            else:
                logger.warning("No price available to push")

        except Exception as e:
            logger.error(f"Oracle push error: {e}")

        await asyncio.sleep(settings.oracle_push_interval)


async def start_oracle_service():
    """Start the Binance WS feed + oracle push loop."""
    logger.info(f"Starting oracle service (source={settings.price_source})")

    if settings.price_source == "binance":
        await asyncio.gather(
            binance_ws_feed(),
            oracle_push_loop(),
        )
    else:
        await oracle_push_loop()
