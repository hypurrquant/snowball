import asyncio
import logging
from collections import deque

from app.common.web3_client import get_account, get_w3, load_abi, send_tx
from app.config import settings
from app.options.eip712 import verify_order_signature
from app.options.schemas import SignedOrder

logger = logging.getLogger(__name__)

# FIFO queues for unmatched orders
over_queue: deque[SignedOrder] = deque()
under_queue: deque[SignedOrder] = deque()

# Matched pairs pending submission
matched_pairs: list[tuple[SignedOrder, SignedOrder]] = []


def add_order(order: SignedOrder) -> dict:
    """Add a signed order to the matching queue."""
    # Verify signature off-chain
    valid = verify_order_signature(
        user=order.user,
        direction=order.direction,
        amount=int(order.amount),
        round_id=order.round_id,
        nonce=order.nonce,
        deadline=order.deadline,
        signature=order.signature,
        verifying_contract=settings.options_relayer_address,
        chain_id=settings.chain_id,
    )

    if not valid:
        return {"status": "rejected", "reason": "invalid signature"}

    if order.direction == 0:
        over_queue.append(order)
    elif order.direction == 1:
        under_queue.append(order)
    else:
        return {"status": "rejected", "reason": "invalid direction"}

    # Try matching
    _try_match()

    return {"status": "accepted", "queue_depth": {"over": len(over_queue), "under": len(under_queue)}}


def _try_match():
    """FIFO match: pair Over and Under orders of same amount."""
    while over_queue and under_queue:
        over = over_queue[0]
        under = under_queue[0]

        if over.amount == under.amount and over.round_id == under.round_id:
            over_queue.popleft()
            under_queue.popleft()
            matched_pairs.append((over, under))
            logger.info(f"Matched: {over.user} (Over) vs {under.user} (Under) for {over.amount}")
        else:
            # Can't match different amounts in simple FIFO — break
            break


async def flush_matched_orders():
    """Submit matched orders to OptionsRelayer contract in batches."""
    if not matched_pairs:
        return

    batch_size = settings.batch_size
    batch = matched_pairs[:batch_size]
    del matched_pairs[:batch_size]

    if not batch:
        return

    w3 = get_w3()
    account = get_account()
    abi = load_abi("OptionsRelayer", "options")
    contract = w3.eth.contract(
        address=w3.to_checksum_address(settings.options_relayer_address),
        abi=abi,
    )

    # Build arrays for submitSignedOrders
    over_orders = []
    under_orders = []

    for over, under in batch:
        over_orders.append((
            over.user,
            over.direction,
            int(over.amount),
            over.round_id,
            over.nonce,
            over.deadline,
            bytes.fromhex(over.signature.removeprefix("0x")),
        ))
        under_orders.append((
            under.user,
            under.direction,
            int(under.amount),
            under.round_id,
            under.nonce,
            under.deadline,
            bytes.fromhex(under.signature.removeprefix("0x")),
        ))

    try:
        fn = contract.functions.submitSignedOrders(over_orders, under_orders)
        tx_hash = await send_tx(w3, fn, account)
        logger.info(f"Flushed {len(batch)} matched pairs (tx: {tx_hash})")
    except Exception as e:
        logger.error(f"Failed to flush matched orders: {e}")
        # Re-queue failed batch
        matched_pairs.extend(batch)


async def relayer_flush_loop():
    """Background task: flush matched orders periodically."""
    while True:
        try:
            await flush_matched_orders()
        except Exception as e:
            logger.error(f"Relayer flush error: {e}")
        await asyncio.sleep(3)
