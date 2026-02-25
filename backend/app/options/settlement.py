import asyncio
import logging

from app.common.web3_client import get_account, get_w3, load_abi, send_tx
from app.config import settings

logger = logging.getLogger(__name__)


async def settlement_loop():
    """Background task: check for expired rounds and settle them."""
    logger.info(f"Settlement loop started (poll_interval={settings.settlement_poll_interval}s)")

    while True:
        try:
            await _check_and_settle()
        except Exception as e:
            logger.error(f"Settlement error: {e}")
        await asyncio.sleep(settings.settlement_poll_interval)


async def _check_and_settle():
    w3 = get_w3()
    account = get_account()
    abi = load_abi("SnowballOptions", "options")
    contract = w3.eth.contract(
        address=w3.to_checksum_address(settings.snowball_options_address),
        abi=abi,
    )

    current_round_id = await contract.functions.currentRoundId().call()
    if current_round_id == 0:
        return

    # Check current and previous rounds
    for round_id in range(max(1, current_round_id - 5), current_round_id + 1):
        try:
            round_data = await contract.functions.getRound(round_id).call()
            # round_data: (roundId, lockPrice, closePrice, lockTimestamp, closeTimestamp, duration, status, totalOver, totalUnder, orderCount)
            status = round_data[6]
            close_timestamp = round_data[4]
            order_count = round_data[9]

            block = await w3.eth.get_block("latest")
            now = block["timestamp"]

            # Status 0 = Open, needs execution if expired
            if status == 0 and now >= close_timestamp and order_count > 0:
                logger.info(f"Executing round {round_id}...")
                fn = contract.functions.executeRound(round_id)
                await send_tx(w3, fn, account)
                logger.info(f"Round {round_id} executed")

            # Status 1 = Locked, needs settlement
            elif status == 1 and order_count > 0:
                logger.info(f"Settling round {round_id} ({order_count} orders)...")
                fn = contract.functions.settleOrders(round_id, settings.batch_size)
                await send_tx(w3, fn, account)
                logger.info(f"Round {round_id} settled batch")

        except Exception as e:
            logger.error(f"Error processing round {round_id}: {e}")
