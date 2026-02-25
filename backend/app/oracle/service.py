import asyncio
import logging

from app.config import settings
from app.oracle.contracts import push_price
from app.oracle.sources import binance_ws_feed, coingecko_fallback, get_latest_price

logger = logging.getLogger(__name__)


async def oracle_push_loop():
    """Background task: push BTC price to oracle every N seconds."""
    logger.info(f"Oracle push loop started (interval={settings.oracle_push_interval}s)")

    while True:
        try:
            price = get_latest_price()

            # Fallback to CoinGecko if no Binance data
            if price <= 0:
                price = await coingecko_fallback()

            if price > 0:
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
        # Start WS feed and push loop concurrently
        await asyncio.gather(
            binance_ws_feed(),
            oracle_push_loop(),
        )
    else:
        # CoinGecko-only mode: just poll + push
        await oracle_push_loop()
