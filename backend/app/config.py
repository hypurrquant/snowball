from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # RPC
    rpc_url: str = "https://rpc.cc3-testnet.creditcoin.network"
    chain_id: int = 102031

    # Operator wallet
    operator_private_key: str = ""

    # Contract addresses
    oracle_btc_address: str = ""          # Legacy (BTCMockOracle)
    oracle_address: str = ""              # SnowballOracle (multi-asset)
    wctc_address: str = ""
    lstctc_address: str = ""
    sbusd_address: str = ""
    lstctc_premium: float = 1.05          # lstCTC = wCTC * 1.05
    ctc_price_override: float = 0.0       # testnet fixed price (0 = use live feed)
    clearing_house_address: str = ""
    options_vault_address: str = ""
    snowball_options_address: str = ""
    options_relayer_address: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Oracle
    oracle_push_interval: int = 10  # seconds
    price_source: str = "binance"  # binance | coingecko

    # Keeper
    keeper_address: str = ""
    keeper_harvest_interval: int = 14400  # 4 hours (matches on-chain interval)

    # Options
    round_duration: int = 300  # 5 minutes
    settlement_poll_interval: int = 5
    batch_size: int = 50

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
