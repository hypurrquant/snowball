from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # RPC
    rpc_url: str = "https://rpc.cc3-testnet.creditcoin.network"
    chain_id: int = 102031

    # Operator wallet
    operator_private_key: str = ""

    # Contract addresses
    oracle_btc_address: str = ""
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

    # Options
    round_duration: int = 300  # 5 minutes
    settlement_poll_interval: int = 5
    batch_size: int = 50

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
