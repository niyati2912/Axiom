"""Axiom autonomous engine orchestrator."""
from __future__ import annotations
import asyncio
import json
import logging
from datetime import datetime
from .config import settings
from .simulation import simulator
from .intent_engine import intent_engine
from .market_monitor import market_monitor
from .opportunity_detector import opportunity_detector
from .store import store

logger = logging.getLogger("axiom.engine")


class AxiomEngine:
    def __init__(self):
        self._running = False
        self._tasks: list[asyncio.Task] = []
        self._ws_connections: set = set()
        self._sse_queues: set[asyncio.Queue] = set()

    async def start(self):
        if self._running:
            return
        self._running = True
        self._tasks = [
            asyncio.create_task(self._event_loop()),
            asyncio.create_task(self._intent_loop()),
            asyncio.create_task(self._market_loop()),
            asyncio.create_task(self._opportunity_loop()),
            asyncio.create_task(self._stats_loop()),
        ]
        logger.info("Axiom Engine started with %d background loops", len(self._tasks))

    async def stop(self):
        self._running = False
        for task in self._tasks:
            task.cancel()
        self._tasks.clear()

    def register_ws(self, ws):
        self._ws_connections.add(ws)

    def unregister_ws(self, ws):
        self._ws_connections.discard(ws)

    def register_sse(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=50)
        self._sse_queues.add(q)
        return q

    def unregister_sse(self, q: asyncio.Queue):
        self._sse_queues.discard(q)

    async def broadcast(self, event_type: str, data: dict):
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        message = json.dumps(payload, default=str)

        dead_ws = set()
        for ws in list(self._ws_connections):
            try:
                await ws.send_text(message)
            except Exception:
                dead_ws.add(ws)
        self._ws_connections -= dead_ws

        for q in list(self._sse_queues):
            try:
                if q.full():
                    q.get_nowait()
                q.put_nowait(message)
            except Exception:
                pass

    async def _event_loop(self):
        while self._running:
            try:
                events = simulator.generate_events(count=1)
                for evt in events:
                    await self.broadcast("shopper_event", evt.model_dump(mode="json"))
                await asyncio.sleep(settings.EVENT_GENERATION_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Event loop error: %s", e)
                await asyncio.sleep(1.5)

    async def _intent_loop(self):
        while self._running:
            try:
                intent_engine.score_all_shoppers()
                high_intent = [
                    s for s in store.get_all_shoppers()
                    if s.intent_score >= 0.70 and s.status == "active"
                ]
                await self.broadcast(
                    "intent_update",
                    {
                        "high_intent_count": len(high_intent),
                        "avg_intent": round(sum(s.intent_score for s in high_intent) / max(len(high_intent), 1), 3),
                    },
                )
                await asyncio.sleep(settings.INTENT_RECALC_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Intent loop error: %s", e)
                await asyncio.sleep(2.5)

    async def _market_loop(self):
        while self._running:
            try:
                events = market_monitor.check_market_conditions()
                for evt in events:
                    await self.broadcast("market_event", evt.model_dump(mode="json"))
                await asyncio.sleep(settings.MARKET_CHECK_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Market loop error: %s", e)
                await asyncio.sleep(4)

    async def _opportunity_loop(self):
        while self._running:
            try:
                opps, actions = opportunity_detector.detect_opportunities()
                for opp in opps:
                    await self.broadcast("opportunity", opp.model_dump(mode="json"))
                for act in actions:
                    await self.broadcast("action", act.model_dump(mode="json"))
                await asyncio.sleep(settings.OPPORTUNITY_CHECK_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Opportunity loop error: %s", e)
                await asyncio.sleep(4)

    async def _stats_loop(self):
        while self._running:
            try:
                store.update_stats()
                await self.broadcast("stats_update", store.stats.model_dump(mode="json"))
                await asyncio.sleep(3.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Stats loop error: %s", e)
                await asyncio.sleep(3.0)


axiom_engine = AxiomEngine()
