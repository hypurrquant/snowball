import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.oracle.service import start_oracle_service
from app.options.relayer import relayer_flush_loop
from app.options.settlement import settlement_loop
from app.price.websocket import price_broadcast_loop, price_ws_handler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage background tasks lifecycle."""
    tasks: list[asyncio.Task] = []

    # Start background services if configured
    if settings.operator_private_key and settings.oracle_btc_address:
        tasks.append(asyncio.create_task(start_oracle_service()))
        logger.info("Oracle service started")

    if settings.operator_private_key and settings.snowball_options_address:
        tasks.append(asyncio.create_task(settlement_loop()))
        logger.info("Settlement loop started")

    if settings.operator_private_key and settings.options_relayer_address:
        tasks.append(asyncio.create_task(relayer_flush_loop()))
        logger.info("Relayer flush loop started")

    # Always start price broadcast
    tasks.append(asyncio.create_task(price_broadcast_loop()))
    logger.info("Price broadcast started")

    yield

    # Cleanup
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    logger.info("All background tasks stopped")


app = FastAPI(
    title="Snowball Backend",
    description="Oracle + Price + Options + Settlement API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from app.options.router import router as options_router
from app.price.router import router as price_router

app.include_router(price_router)
app.include_router(options_router)


# WebSocket endpoint
@app.websocket("/ws/price")
async def ws_price(websocket: WebSocket):
    await price_ws_handler(websocket)


# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/")
async def root():
    return {
        "name": "Snowball Backend",
        "version": "0.1.0",
        "endpoints": {
            "health": "/health",
            "price_current": "/api/price/btc/current",
            "price_history": "/api/price/btc/history",
            "price_ohlcv": "/api/price/btc/ohlcv",
            "price_ws": "/ws/price",
            "options_order": "/api/options/order",
            "options_rounds": "/api/options/rounds",
            "options_history": "/api/options/history",
            "options_balance": "/api/options/balance",
        },
    }
