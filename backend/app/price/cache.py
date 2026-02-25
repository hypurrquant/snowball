import time
from collections import deque
from dataclasses import dataclass, field


@dataclass
class PriceTick:
    price: float
    timestamp: float


@dataclass
class OHLCVBar:
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
    timestamp: float = 0.0


class PriceCache:
    """In-memory price history with OHLCV aggregation."""

    def __init__(self, max_ticks: int = 86_400):
        self._ticks: deque[PriceTick] = deque(maxlen=max_ticks)

    def add_tick(self, price: float):
        self._ticks.append(PriceTick(price=price, timestamp=time.time()))

    @property
    def latest(self) -> PriceTick | None:
        return self._ticks[-1] if self._ticks else None

    def history(self, interval_sec: int = 60, limit: int = 100) -> list[PriceTick]:
        """Return sampled price history at given interval."""
        if not self._ticks:
            return []

        result: list[PriceTick] = []
        now = time.time()
        cutoff = now - interval_sec * limit

        # Sample at interval boundaries
        bucket_start = cutoff
        for tick in self._ticks:
            if tick.timestamp < cutoff:
                continue
            while tick.timestamp >= bucket_start + interval_sec:
                bucket_start += interval_sec
            if not result or (tick.timestamp - result[-1].timestamp) >= interval_sec * 0.9:
                result.append(tick)

        return result[-limit:]

    def ohlcv(self, interval_sec: int = 60, limit: int = 100) -> list[OHLCVBar]:
        """Aggregate ticks into OHLCV bars."""
        if not self._ticks:
            return []

        now = time.time()
        cutoff = now - interval_sec * limit

        bars: list[OHLCVBar] = []
        current_bar: OHLCVBar | None = None
        bar_end = 0.0

        for tick in self._ticks:
            if tick.timestamp < cutoff:
                continue

            if current_bar is None or tick.timestamp >= bar_end:
                if current_bar is not None:
                    bars.append(current_bar)
                bar_start = tick.timestamp - (tick.timestamp % interval_sec)
                bar_end = bar_start + interval_sec
                current_bar = OHLCVBar(
                    open=tick.price,
                    high=tick.price,
                    low=tick.price,
                    close=tick.price,
                    timestamp=bar_start,
                )
            else:
                current_bar.high = max(current_bar.high, tick.price)
                current_bar.low = min(current_bar.low, tick.price)
                current_bar.close = tick.price

        if current_bar is not None:
            bars.append(current_bar)

        return bars[-limit:]


# Global singleton
price_cache = PriceCache()
