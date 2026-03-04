import asyncio
import logging

from app.common.web3_client import get_account, get_w3, load_abi, send_tx
from app.config import settings

logger = logging.getLogger(__name__)


def get_keeper_contract(w3):
    abi = load_abi("SnowballKeeper", "yield")
    return w3.eth.contract(
        address=w3.to_checksum_address(settings.keeper_address),
        abi=abi,
    )


async def keeper_harvest_loop():
    """Background task: call harvestAll() on SnowballKeeper periodically."""
    logger.info(f"Keeper harvest loop started (interval={settings.keeper_harvest_interval}s)")

    while True:
        try:
            w3 = get_w3()
            account = get_account()
            contract = get_keeper_contract(w3)

            # Check how many strategies are registered
            count = await contract.functions.strategiesLength().call()
            if count == 0:
                logger.warning("No strategies registered in keeper")
                await asyncio.sleep(settings.keeper_harvest_interval)
                continue

            # Call harvestAll
            fn = contract.functions.harvestAll()
            tx_hash = await send_tx(w3, fn, account)
            logger.info(f"Keeper harvestAll() executed: {count} strategies (tx: {tx_hash})")

        except Exception as e:
            error_msg = str(e)
            if "!ready" in error_msg:
                logger.debug("No strategies ready for harvest yet")
            else:
                logger.error(f"Keeper harvest error: {e}")

        await asyncio.sleep(settings.keeper_harvest_interval)


async def start_keeper_service():
    """Start the keeper harvest loop."""
    logger.info("Starting keeper service")
    await keeper_harvest_loop()
