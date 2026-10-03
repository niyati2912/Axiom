"""SQLite persistence layer for Axiom autonomous commerce engine.
Persists event history, shopper state, market events, opportunities, and recovery actions.
Clearly separated so PostgreSQL or Redis/Kafka adapters can drop in seamlessly."""
from __future__ import annotations
import json
import sqlite3
import threading
from pathlib import Path
from typing import List, Dict, Any

DB_PATH = Path(__file__).resolve().parent / "axiom_engine.db"


class PersistenceAdapter:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._lock = threading.RLock()
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self):
        with self._lock, self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS events_log (
                    id TEXT PRIMARY KEY,
                    shopper_id TEXT,
                    shopper_display_id TEXT,
                    event_type TEXT,
                    label TEXT,
                    detail TEXT,
                    product_id TEXT,
                    product_name TEXT,
                    product_price REAL,
                    search_query TEXT,
                    timestamp TEXT,
                    payload_json TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_events_ts ON events_log(timestamp DESC);
                CREATE INDEX IF NOT EXISTS idx_events_shopper ON events_log(shopper_id);

                CREATE TABLE IF NOT EXISTS actions_log (
                    id TEXT PRIMARY KEY,
                    action_type TEXT,
                    shopper_id TEXT,
                    shopper_display_id TEXT,
                    product_id TEXT,
                    product_name TEXT,
                    trigger_text TEXT,
                    status TEXT,
                    result_text TEXT,
                    revenue_recovered REAL,
                    created_at TEXT,
                    payload_json TEXT
                );

                CREATE TABLE IF NOT EXISTS market_events_log (
                    id TEXT PRIMARY KEY,
                    product_id TEXT,
                    product_name TEXT,
                    event_type TEXT,
                    old_value REAL,
                    new_value REAL,
                    change_pct REAL,
                    timestamp TEXT,
                    payload_json TEXT
                );
                """
            )
            conn.commit()

    def record_event(self, event_dict: Dict[str, Any]):
        try:
            with self._lock, self._connect() as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO events_log
                    (id, shopper_id, shopper_display_id, event_type, label, detail,
                     product_id, product_name, product_price, search_query, timestamp, payload_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event_dict.get("id"),
                        event_dict.get("shopper_id"),
                        event_dict.get("shopper_display_id", ""),
                        event_dict.get("event_type"),
                        event_dict.get("label", ""),
                        event_dict.get("detail", ""),
                        event_dict.get("product_id"),
                        event_dict.get("product_name"),
                        event_dict.get("product_price"),
                        event_dict.get("search_query"),
                        str(event_dict.get("timestamp", "")),
                        json.dumps(event_dict, default=str),
                    ),
                )
                conn.commit()
        except Exception:
            pass

    def record_action(self, action_dict: Dict[str, Any]):
        try:
            with self._lock, self._connect() as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO actions_log
                    (id, action_type, shopper_id, shopper_display_id, product_id, product_name,
                     trigger_text, status, result_text, revenue_recovered, created_at, payload_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        action_dict.get("id"),
                        action_dict.get("action_type"),
                        action_dict.get("shopper_id"),
                        action_dict.get("shopper_display_id", ""),
                        action_dict.get("product_id"),
                        action_dict.get("product_name", ""),
                        action_dict.get("trigger", ""),
                        action_dict.get("status", ""),
                        action_dict.get("result", ""),
                        float(action_dict.get("revenue_recovered", 0.0)),
                        str(action_dict.get("created_at", "")),
                        json.dumps(action_dict, default=str),
                    ),
                )
                conn.commit()
        except Exception:
            pass

    def record_market_event(self, market_dict: Dict[str, Any]):
        try:
            with self._lock, self._connect() as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO market_events_log
                    (id, product_id, product_name, event_type, old_value, new_value, change_pct, timestamp, payload_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        market_dict.get("id"),
                        market_dict.get("product_id"),
                        market_dict.get("product_name"),
                        market_dict.get("event_type"),
                        market_dict.get("old_value"),
                        market_dict.get("new_value"),
                        market_dict.get("change_pct"),
                        str(market_dict.get("timestamp", "")),
                        json.dumps(market_dict, default=str),
                    ),
                )
                conn.commit()
        except Exception:
            pass

    def count_persisted_events(self) -> int:
        try:
            with self._lock, self._connect() as conn:
                row = conn.execute("SELECT COUNT(*) AS c FROM events_log").fetchone()
                return int(row["c"]) if row else 0
        except Exception:
            return 0


persistence = PersistenceAdapter()
