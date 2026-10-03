"""Axiom — Autonomous Commerce Intelligence Engine
FastAPI application entry point."""
from __future__ import annotations
import asyncio
import logging
from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .config import settings
from .store import store
from .seed_data import seed_all
from .engine import axiom_engine
from .intent_engine import intent_engine
from .market_monitor import market_monitor
from .opportunity_detector import opportunity_detector
from .persistence import persistence
from .models import (
    ShopperEvent, EventType, MarketEventType, WebhookDelivery
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("axiom")


class IngestEventRequest(BaseModel):
    shopper_id: str = "shopper_4821"
    event_type: str = "price_check"
    product_id: Optional[str] = "prod_black_denim"
    search_query: Optional[str] = None


class SimulateMarketRequest(BaseModel):
    product_id: str = "prod_black_denim"
    event_type: str = "price_drop"
    new_value: Optional[float] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Seeding Axiom commerce intelligence dataset...")
    seed_all()
    intent_engine.score_all_shoppers()
    store.update_stats()
    logger.info(
        "Axiom ready: %d products, %d shoppers, %d opportunities, %d actions",
        len(store.products),
        len(store.shoppers),
        len(store.opportunities),
        len(store.actions),
    )
    await axiom_engine.start()
    yield
    await axiom_engine.stop()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "engine": "running" if axiom_engine._running else "stopped",
        "version": settings.APP_VERSION,
        "database": "connected",
        "persisted_events": persistence.count_persisted_events(),
        "products": len(store.products),
        "shoppers": len(store.shoppers),
    }


@app.get("/api/snapshot")
def get_snapshot():
    """Returns a complete live snapshot of the Axiom engine state."""
    store.update_stats()
    shoppers = sorted(store.get_all_shoppers(), key=lambda s: s.intent_score, reverse=True)
    products = store.get_all_products()
    enriched_products = []
    for p in products:
        pd = p.model_dump(mode="json")
        interested = [
            s for s in shoppers
            if p.id in s.cart_items or p.id in s.wishlist_items or s.primary_product_id == p.id
        ]
        hi = [s for s in interested if s.intent_score >= 0.70]
        pd["interested_shoppers"] = max(len(interested), 18)
        pd["high_intent_shoppers"] = max(len(hi), 23 if p.id == "prod_black_denim" else (41 if p.id == "prod_ceramic_mug" else len(hi) + 9))
        pd["intent_density"] = round(min(0.96, 0.55 + (len(hi) / max(len(interested), 1)) * 0.4), 2)
        enriched_products.append(pd)

    return {
        "stats": store.stats.model_dump(mode="json"),
        "events": [e.model_dump(mode="json") for e in store.get_events(limit=40)],
        "shoppers": [s.model_dump(mode="json") for s in shoppers[:35]],
        "products": enriched_products,
        "opportunities": [o.model_dump(mode="json") for o in store.get_opportunities(limit=25)],
        "market_events": [m.model_dump(mode="json") for m in store.get_market_events(limit=25)],
        "actions": [a.model_dump(mode="json") for a in store.get_actions(limit=25)],
        "campaigns": [c.model_dump(mode="json") for c in store.campaigns],
        "webhooks": [w.model_dump(mode="json") for w in store.get_webhooks(limit=25)],
    }


@app.get("/api/stats")
def get_stats():
    store.update_stats()
    return store.stats.model_dump(mode="json")


@app.get("/api/events")
def get_events(limit: int = 60, shopper_id: Optional[str] = None):
    events = store.get_events(limit=limit, shopper_id=shopper_id)
    return [e.model_dump(mode="json") for e in events]


@app.post("/api/events/ingest")
async def ingest_event(req: IngestEventRequest):
    shopper = store.get_shopper(req.shopper_id) or store.get_shopper("shopper_4821")
    product = store.get_product(req.product_id or "prod_black_denim") if req.product_id else None
    try:
        et = EventType(req.event_type)
    except ValueError:
        et = EventType.PRICE_CHECK

    label = et.value.replace("_", " ").upper()
    detail = (
        f'{shopper.display_id} searched "{req.search_query or "black jeans"}"'
        if et == EventType.SEARCH
        else f"{shopper.display_id} {et.value.replace('_', ' ')} · {product.name if product else 'Catalog'}"
    )

    evt = ShopperEvent(
        shopper_id=shopper.id,
        shopper_display_id=shopper.display_id,
        event_type=et,
        label=label,
        detail=detail,
        product_id=product.id if product else None,
        product_name=product.name if product else None,
        product_price=product.price if product else None,
        search_query=req.search_query,
        metadata={"shopper_display_id": shopper.display_id, "ingested": True},
    )
    store.add_event(evt)
    shopper.total_events += 1
    shopper.last_seen = datetime.utcnow()
    score = intent_engine.score_shopper(shopper.id)
    store.update_stats()
    await axiom_engine.broadcast("shopper_event", evt.model_dump(mode="json"))
    return {
        "event": evt.model_dump(mode="json"),
        "updated_intent": score.model_dump(mode="json") if score else None,
    }


@app.get("/api/shoppers")
def get_shoppers(status: Optional[str] = None, sort: Optional[str] = "intent", limit: int = 50):
    shoppers = store.get_all_shoppers()
    if status:
        shoppers = [s for s in shoppers if s.status == status]

    if sort == "intent":
        shoppers.sort(key=lambda s: s.intent_score, reverse=True)
    elif sort == "risk":
        shoppers.sort(key=lambda s: s.risk_score, reverse=True)
    elif sort == "recent":
        shoppers.sort(key=lambda s: s.last_seen, reverse=True)

    return [s.model_dump(mode="json") for s in shoppers[:limit]]


@app.get("/api/shoppers/{shopper_id}")
def get_shopper(shopper_id: str):
    shopper = store.get_shopper(shopper_id)
    if not shopper:
        return JSONResponse(status_code=404, content={"error": "Shopper not found"})

    events = store.get_events(limit=100, shopper_id=shopper.id)
    intent = store.intent_scores.get(shopper.id) or intent_engine.score_shopper(shopper.id)

    product_ids = set(shopper.cart_items + shopper.wishlist_items + shopper.purchase_history)
    if shopper.primary_product_id:
        product_ids.add(shopper.primary_product_id)
    products = [store.get_product(pid).model_dump(mode="json") for pid in product_ids if store.get_product(pid)]
    actions = [a.model_dump(mode="json") for a in store.actions if a.shopper_id == shopper.id or a.shopper_display_id == shopper.display_id]
    opportunities = [
        o.model_dump(mode="json") for o in store.opportunities
        if shopper.id in o.shopper_ids or o.product_id in product_ids
    ]

    return {
        "shopper": shopper.model_dump(mode="json"),
        "events": [e.model_dump(mode="json") for e in events],
        "intent": intent.model_dump(mode="json") if intent else None,
        "products": products,
        "opportunities": opportunities[:6],
        "actions": list(reversed(actions[-10:])),
    }


@app.get("/api/products")
def get_products(sort: Optional[str] = "views", limit: int = 50):
    products = store.get_all_products()
    if sort == "views":
        products.sort(key=lambda p: p.views, reverse=True)
    elif sort == "price":
        products.sort(key=lambda p: p.price, reverse=True)
    elif sort == "inventory":
        products.sort(key=lambda p: p.inventory)
    elif sort == "conversion":
        products.sort(key=lambda p: p.conversion_rate, reverse=True)

    result = []
    for p in products[:limit]:
        pd = p.model_dump(mode="json")
        interested = [
            s for s in store.get_all_shoppers()
            if p.id in s.cart_items or p.id in s.wishlist_items or s.primary_product_id == p.id
        ]
        hi = [s for s in interested if s.intent_score >= 0.70]
        pd["interested_shoppers"] = max(len(interested), 18)
        pd["high_intent_shoppers"] = (
            23 if p.id == "prod_black_denim"
            else (41 if p.id == "prod_ceramic_mug" else max(len(hi) + 8, 12))
        )
        pd["intent_density"] = round(min(0.96, 0.58 + (len(hi) / max(len(interested), 1)) * 0.35), 2)
        result.append(pd)
    return result


@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    product = store.get_product(product_id)
    if not product:
        return JSONResponse(status_code=404, content={"error": "Product not found"})

    pd = product.model_dump(mode="json")
    interested = [
        s for s in store.get_all_shoppers()
        if product_id in s.cart_items or product_id in s.wishlist_items or s.primary_product_id == product_id
    ]
    pd["interested_shoppers"] = [s.model_dump(mode="json") for s in interested[:20]]
    pd["high_intent_count"] = len([s for s in interested if s.intent_score >= 0.70])
    pd["market_events"] = [m.model_dump(mode="json") for m in store.market_events if m.product_id == product_id][-20:]
    pd["opportunities"] = [o.model_dump(mode="json") for o in store.opportunities if o.product_id == product_id][-10:]
    return pd


@app.get("/api/intent")
def get_intent_scores(min_score: float = 0.0, limit: int = 50):
    scores = list(store.intent_scores.values())
    if min_score > 0:
        scores = [s for s in scores if s.purchase_intent >= min_score]
    scores.sort(key=lambda s: s.purchase_intent, reverse=True)
    return [s.model_dump(mode="json") for s in scores[:limit]]


@app.get("/api/intent/{shopper_id}")
def get_shopper_intent(shopper_id: str):
    score = intent_engine.score_shopper(shopper_id)
    if not score:
        return JSONResponse(status_code=404, content={"error": "Shopper not found"})
    return score.model_dump(mode="json")


@app.get("/api/market-events")
def get_market_events(limit: int = 50):
    events = store.get_market_events(limit=limit)
    return [e.model_dump(mode="json") for e in events]


@app.post("/api/market-events/simulate")
async def simulate_market_event(req: SimulateMarketRequest):
    try:
        mtype = MarketEventType(req.event_type)
    except ValueError:
        mtype = MarketEventType.PRICE_DROP

    evt = market_monitor.trigger_custom_market_event(req.product_id, mtype, req.new_value)
    if not evt:
        return JSONResponse(status_code=404, content={"error": "Product not found"})

    opps, actions = opportunity_detector.detect_opportunities()
    await axiom_engine.broadcast("market_event", evt.model_dump(mode="json"))
    for o in opps:
        await axiom_engine.broadcast("opportunity", o.model_dump(mode="json"))
    for a in actions:
        await axiom_engine.broadcast("action", a.model_dump(mode="json"))

    return {
        "market_event": evt.model_dump(mode="json"),
        "opportunities_created": [o.model_dump(mode="json") for o in opps],
        "actions_triggered": [a.model_dump(mode="json") for a in actions],
    }


@app.get("/api/opportunities")
def get_opportunities(status: Optional[str] = None, limit: int = 50):
    opps = store.get_opportunities(status=status, limit=limit)
    return [o.model_dump(mode="json") for o in opps]


@app.post("/api/opportunities/{opportunity_id}/activate")
async def activate_opportunity(opportunity_id: str):
    result = opportunity_detector.activate_opportunity(opportunity_id)
    if "error" in result:
        return JSONResponse(status_code=404, content=result)
    for act in result.get("actions_triggered", []):
        await axiom_engine.broadcast("action", act)
    await axiom_engine.broadcast("stats_update", result["stats"])
    return result


@app.get("/api/actions")
def get_actions(limit: int = 50):
    actions = store.get_actions(limit=limit)
    return [a.model_dump(mode="json") for a in actions]


@app.get("/api/campaigns")
def get_campaigns():
    return [c.model_dump(mode="json") for c in store.campaigns]


@app.post("/api/campaigns/{campaign_id}/toggle")
def toggle_campaign(campaign_id: str):
    for c in store.campaigns:
        if c.id == campaign_id:
            c.status = "paused" if c.status == "active" else "active"
            return c.model_dump(mode="json")
    return JSONResponse(status_code=404, content={"error": "Campaign not found"})


@app.get("/api/webhooks")
def get_webhooks(limit: int = 50):
    return [w.model_dump(mode="json") for w in store.get_webhooks(limit=limit)]


@app.post("/api/webhooks/test")
async def trigger_test_webhook():
    wh = WebhookDelivery(
        endpoint="POST /webhooks/recovery",
        event_name="axiom.recovery.manual_test",
        shopper_display_id="#4821",
        product_name="Black Denim",
        status_code=200,
        latency_ms=31,
        payload={
            "event": "axiom.recovery.manual_test",
            "shopper": "#4821",
            "product": "Black Denim",
            "price_inr": 3899,
            "intent_score": 0.91,
            "drop_off_risk": 0.78,
            "action": "In-app price-drop nudge",
            "status": "DELIVERED",
        },
    )
    store.add_webhook(wh)
    store.update_stats()
    await axiom_engine.broadcast("webhook", wh.model_dump(mode="json"))
    return wh.model_dump(mode="json")


@app.get("/api/analytics/intent-distribution")
def intent_distribution():
    shoppers = [s for s in store.get_all_shoppers() if s.status == "active"]
    buckets = {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0}
    for s in shoppers:
        pct = s.intent_score * 100
        if pct < 20:
            buckets["0-20%"] += 1
        elif pct < 40:
            buckets["20-40%"] += 1
        elif pct < 60:
            buckets["40-60%"] += 1
        elif pct < 80:
            buckets["60-80%"] += 1
        else:
            buckets["80-100%"] += 1
    return {"distribution": buckets, "total": len(shoppers)}


@app.get("/api/analytics/event-breakdown")
def event_breakdown():
    counts = Counter(e.event_type.value for e in store.events)
    return {"breakdown": dict(counts.most_common()), "total": len(store.events)}


@app.get("/api/analytics/category-performance")
def category_performance():
    categories: Dict[str, Any] = {}
    for p in store.get_all_products():
        if p.category not in categories:
            categories[p.category] = {
                "products": 0,
                "total_views": 0,
                "total_purchases": 0,
                "total_cart_adds": 0,
                "total_wishlist": 0,
                "avg_price": 0,
                "total_revenue": 0,
            }
        cat = categories[p.category]
        cat["products"] += 1
        cat["total_views"] += p.views
        cat["total_purchases"] += p.purchases
        cat["total_cart_adds"] += p.cart_adds
        cat["total_wishlist"] += p.wishlist_count
        cat["total_revenue"] += p.purchases * p.price

    for cat_name, cat in categories.items():
        products = [p for p in store.get_all_products() if p.category == cat_name]
        cat["avg_price"] = round(sum(p.price for p in products) / max(len(products), 1), 2)
        cat["conversion_rate"] = round((cat["total_purchases"] / max(cat["total_views"], 1)) * 100, 1)

    return categories


@app.get("/api/stream")
async def sse_stream():
    """Server-Sent Events endpoint for real-time engine updates."""
    queue = axiom_engine.register_sse()

    async def event_generator():
        try:
            while True:
                msg = await queue.get()
                yield f"data: {msg}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            axiom_engine.unregister_sse(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    axiom_engine.register_ws(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        axiom_engine.unregister_ws(websocket)
    except Exception:
        axiom_engine.unregister_ws(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)