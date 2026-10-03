"""Market condition monitor for Axiom.
Tracks price movements, inventory depletion, stock status, discounts, and competitor pricing."""
from __future__ import annotations
import random
from datetime import datetime
from typing import Optional
from .models import MarketEvent, MarketEventType
from .store import store


class MarketMonitor:
    def check_market_conditions(self) -> list[MarketEvent]:
        new_events: list[MarketEvent] = []
        products = store.get_all_products()
        if not products:
            return new_events

        if random.random() > 0.55:
            return new_events

        product = random.choice(products)
        event = self._generate_market_event(product)
        if event:
            store.add_market_event(event)
            self._apply_market_event(event, product)
            new_events.append(event)

        return new_events

    def trigger_custom_market_event(
        self, product_id: str, event_type: MarketEventType, new_value: Optional[float] = None
    ) -> Optional[MarketEvent]:
        product = store.get_product(product_id)
        if not product:
            return None

        interested = [
            s for s in store.get_all_shoppers()
            if product.id in s.cart_items or product.id in s.wishlist_items or s.primary_product_id == product.id
        ]
        avg_intent = round(sum(s.intent_score for s in interested) / max(len(interested), 1), 2) if interested else 0.85
        avg_risk = round(sum(s.risk_score for s in interested) / max(len(interested), 1), 2) if interested else 0.72

        if event_type in (MarketEventType.PRICE_DROP, MarketEventType.NEW_DISCOUNT):
            old_val = product.price
            target_val = new_value if new_value is not None else round(product.price * 0.89)
            change_pct = round(((target_val - old_val) / max(old_val, 1)) * 100, 1)
            evt = MarketEvent(
                product_id=product.id,
                product_name=product.name,
                category=product.category,
                event_type=event_type,
                old_value=old_val,
                new_value=target_val,
                change_pct=change_pct,
                affected_shoppers=max(len(interested), 14),
                avg_shopper_intent=avg_intent,
                avg_drop_off_risk=avg_risk,
                summary=f"Price dropped {abs(change_pct):.1f}% (₹{old_val:,.0f} → ₹{target_val:,.0f}) with {max(len(interested), 14)} high-intent shoppers watching.",
                metadata={"reduction_inr": round(old_val - target_val)},
            )
        else:
            old_val = float(product.inventory)
            target_val = new_value if new_value is not None else float(max(4, product.inventory - random.randint(3, 8)))
            change_pct = round(((target_val - old_val) / max(old_val, 1)) * 100, 1)
            evt = MarketEvent(
                product_id=product.id,
                product_name=product.name,
                category=product.category,
                event_type=MarketEventType.LOW_STOCK,
                old_value=old_val,
                new_value=target_val,
                change_pct=change_pct,
                affected_shoppers=max(len(interested), 19),
                avg_shopper_intent=avg_intent,
                avg_drop_off_risk=avg_risk,
                summary=f"Inventory dropped to {int(target_val)} units on {product.name} ({product.wishlist_count} watchlist saves).",
                metadata={"watchlist": product.wishlist_count, "urgency": "HIGH"},
            )

        store.add_market_event(evt)
        self._apply_market_event(evt, product)
        return evt

    def _generate_market_event(self, product) -> Optional[MarketEvent]:
        interested = [
            s for s in store.get_all_shoppers()
            if product.id in s.cart_items or product.id in s.wishlist_items or s.primary_product_id == product.id
        ]
        affected = max(len(interested), random.randint(12, 34))
        avg_intent = round(sum(s.intent_score for s in interested) / max(len(interested), 1), 2) if interested else 0.84
        avg_risk = round(sum(s.risk_score for s in interested) / max(len(interested), 1), 2) if interested else 0.68

        event_type = random.choices(
            [MarketEventType.PRICE_DROP, MarketEventType.LOW_STOCK, MarketEventType.NEW_DISCOUNT, MarketEventType.COMPETITOR_PRICE_CHANGE],
            weights=[0.40, 0.30, 0.20, 0.10],
        )[0]

        if event_type in (MarketEventType.PRICE_DROP, MarketEventType.NEW_DISCOUNT):
            drop_pct = random.uniform(0.06, 0.14)
            old_price = product.price
            new_price = max(round(product.original_price * 0.72), round(old_price * (1 - drop_pct)))
            if new_price >= old_price:
                new_price = round(product.original_price * 0.88)
                old_price = product.original_price
            actual_pct = round(((new_price - old_price) / max(old_price, 1)) * 100, 1)
            return MarketEvent(
                product_id=product.id,
                product_name=product.name,
                category=product.category,
                event_type=event_type,
                old_value=old_price,
                new_value=new_price,
                change_pct=actual_pct,
                affected_shoppers=affected,
                avg_shopper_intent=avg_intent,
                avg_drop_off_risk=avg_risk,
                summary=f"{product.name} price dropped {abs(actual_pct):.1f}% (₹{old_price:,.0f} → ₹{new_price:,.0f}) across {affected} active high-intent shoppers.",
                metadata={"reduction_inr": round(old_price - new_price)},
            )
        elif event_type == MarketEventType.LOW_STOCK:
            old_inv = max(product.inventory, 14)
            new_inv = random.randint(5, 12)
            return MarketEvent(
                product_id=product.id,
                product_name=product.name,
                category=product.category,
                event_type=event_type,
                old_value=old_inv,
                new_value=new_inv,
                change_pct=round(((new_inv - old_inv) / max(old_inv, 1)) * 100, 1),
                affected_shoppers=affected,
                avg_shopper_intent=avg_intent,
                avg_drop_off_risk=avg_risk,
                summary=f"Inventory pressure on {product.name}: {new_inv} units remaining ({product.wishlist_count} watchlisted).",
                metadata={"urgency": "HIGH", "watchlist": product.wishlist_count},
            )
        else:
            comp_old = product.competitor_price or round(product.price * 1.08)
            comp_new = round(product.price * 0.97)
            return MarketEvent(
                product_id=product.id,
                product_name=product.name,
                category=product.category,
                event_type=MarketEventType.COMPETITOR_PRICE_CHANGE,
                old_value=comp_old,
                new_value=comp_new,
                change_pct=round(((comp_new - comp_old) / max(comp_old, 1)) * 100, 1),
                affected_shoppers=affected,
                avg_shopper_intent=avg_intent,
                avg_drop_off_risk=avg_risk,
                summary=f"Competitor benchmark shift detected on {product.name} (₹{comp_old:,.0f} → ₹{comp_new:,.0f}).",
                metadata={"competitor_delta": comp_new - product.price},
            )

    def _apply_market_event(self, event: MarketEvent, product):
        if event.event_type in (MarketEventType.PRICE_DROP, MarketEventType.NEW_DISCOUNT):
            if event.new_value:
                product.price = event.new_value
                product.price_change_pct = round(
                    ((product.price - product.original_price) / max(product.original_price, 1)) * 100, 1
                )
                product.price_history.append({
                    "price": event.new_value,
                    "date": datetime.utcnow().isoformat(),
                    "event": event.event_type.value,
                })
        elif event.event_type == MarketEventType.LOW_STOCK and event.new_value is not None:
            product.inventory = int(event.new_value)


market_monitor = MarketMonitor()
