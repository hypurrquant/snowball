from fastapi import APIRouter, Query

from app.common.web3_client import get_w3, load_abi
from app.config import settings
from app.options.relayer import add_order
from app.options.schemas import BalanceInfo, OrderSubmission, RoundInfo

router = APIRouter(prefix="/api/options", tags=["options"])


@router.post("/order")
async def submit_order(submission: OrderSubmission):
    """Submit a signed order for matching."""
    result = add_order(submission.order)
    return result


@router.get("/rounds")
async def get_rounds(limit: int = Query(10, ge=1, le=100)):
    """Get recent rounds."""
    w3 = get_w3()
    abi = load_abi("SnowballOptions", "options")
    contract = w3.eth.contract(
        address=w3.to_checksum_address(settings.snowball_options_address),
        abi=abi,
    )

    current_id = await contract.functions.currentRoundId().call()
    if current_id == 0:
        return {"rounds": []}

    rounds = []
    start = max(1, current_id - limit + 1)

    for rid in range(start, current_id + 1):
        try:
            r = await contract.functions.getRound(rid).call()
            rounds.append(RoundInfo(
                round_id=r[0],
                lock_price=str(r[1]),
                close_price=str(r[2]),
                lock_timestamp=r[3],
                close_timestamp=r[4],
                duration=r[5],
                status=r[6],
                total_over=str(r[7]),
                total_under=str(r[8]),
                order_count=r[9],
            ))
        except Exception:
            pass

    return {"rounds": [r.model_dump() for r in rounds]}


@router.get("/history")
async def get_history(address: str = Query(..., description="User address")):
    """Get user's order history (reads from recent rounds)."""
    w3 = get_w3()
    abi = load_abi("SnowballOptions", "options")
    contract = w3.eth.contract(
        address=w3.to_checksum_address(settings.snowball_options_address),
        abi=abi,
    )

    current_id = await contract.functions.currentRoundId().call()
    orders = []

    # Check last 20 rounds
    start = max(1, current_id - 20)
    for rid in range(start, current_id + 1):
        try:
            round_data = await contract.functions.getRound(rid).call()
            order_count = round_data[9]
            for oid in range(order_count):
                order = await contract.functions.getOrder(rid, oid).call()
                # order: (overUser, underUser, amount, settled)
                user_lower = address.lower()
                if order[0].lower() == user_lower or order[1].lower() == user_lower:
                    orders.append({
                        "round_id": rid,
                        "order_id": oid,
                        "over_user": order[0],
                        "under_user": order[1],
                        "amount": str(order[2]),
                        "settled": order[3],
                        "user_direction": "over" if order[0].lower() == user_lower else "under",
                    })
        except Exception:
            pass

    return {"address": address, "orders": orders}


@router.get("/balance")
async def get_balance(address: str = Query(..., description="User address")):
    """Get user's ClearingHouse balance and escrow."""
    w3 = get_w3()
    abi = load_abi("OptionsClearingHouse", "options")
    contract = w3.eth.contract(
        address=w3.to_checksum_address(settings.clearing_house_address),
        abi=abi,
    )

    balance = await contract.functions.balanceOf(w3.to_checksum_address(address)).call()
    escrow = await contract.functions.escrowOf(w3.to_checksum_address(address)).call()

    return BalanceInfo(
        address=address,
        balance=str(balance),
        escrow=str(escrow),
    ).model_dump()
