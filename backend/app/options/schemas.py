from pydantic import BaseModel


class SignedOrder(BaseModel):
    user: str        # address
    direction: int   # 0=Over, 1=Under
    amount: str      # wei string
    round_id: int
    nonce: int
    deadline: int
    signature: str   # hex bytes


class OrderSubmission(BaseModel):
    order: SignedOrder


class RoundInfo(BaseModel):
    round_id: int
    lock_price: str
    close_price: str
    lock_timestamp: int
    close_timestamp: int
    duration: int
    status: int  # 0=Open, 1=Locked, 2=Settled
    total_over: str
    total_under: str
    order_count: int


class BalanceInfo(BaseModel):
    address: str
    balance: str
    escrow: str
