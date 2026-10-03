"""Database access. Reuses the same env vars as the original db_connection.py."""
from functools import lru_cache

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

from backend import config


@lru_cache(maxsize=1)
def get_engine():
    missing = config.missing_db_settings()
    if missing:
        raise RuntimeError(f"Missing database environment variables: {', '.join(missing)}")
    s = config.DB_SETTINGS
    # URL.create escapes special characters in the password safely.
    url = URL.create("postgresql+psycopg2", username=s["username"], password=s["password"],
                     host=s["host"], port=int(s["port"]), database=s["database"])
    return create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=5)


def read_sql(query: str, params: dict | None = None) -> pd.DataFrame:
    with get_engine().connect() as conn:
        return pd.read_sql(text(query), conn, params=params or {})
