"""Event simulation layer for Axiom.
Generates realistic granular shopper micro-behaviors and supports real event ingestion."""
from __future__ import annotations
import random
from datetime import datetime
from typing import List, Optional
from .models import ShopperEvent, EventType
from .store import store
from .seed_data import SEARCH_QUERIES


class Simulator:
    def generate_events(self, count: int = 1) -> List[ShopperEvent]:
        new_events: List[ShopperEvent] = []
        active_shoppers = [s for s in store.get_all_shoppers() if s.status == "active"]
        products = store.get_all_products()
        if not active_shoppers or not products:
            return new_events

        for _ in range(count):
            # Weight flagship shoppers higher so live feed feels cohesive
            flagship = [s for s in active_shoppers if s.display_id in ("#4821", "#3912", "#7719", "#2204", "#6140", "#8093")]
            shopper = random.choice(flagship) if (flagship and random.random() > 0.35) else random.choice(active_shoppers)

            product = store.get_product(shopper.primary_product_id) if shopper.primary_product_id else None
            if not product:
                product = random.choice(products)

            event_type = random.choices(
                [
                    EventType.SEARCH,
                    EventType.PRODUCT_VIEW,
                    EventType.ADD_TO_CART,
                    EventType.PRICE_CHECK,
                    EventType.WISHLIST_ADD,
                    EventType.CART_ABANDON,
                    EventType.RETURN_VISIT,
                    EventType.PRODUCT_COMPARE,
                    EventType.HESITATION_DETECTED,
                ],
                weights=[14, 24, 14, 16, 8, 8, 10, 6, 5],
                k=1,
            )[0]

            query = None
            is_axiom = False
            if event_type == EventType.SEARCH:
                query = product.name.lower() if random.random() > 0.4 else random.choice(SEARCH_QUERIES)
                label = "SEARCH"
                detail = f'{shopper.display_id} searched "{query}"'
            elif event_type == EventType.PRODUCT_VIEW:
                product.views += 1
                label = "PRODUCT VIEW"
                detail = f"{shopper.display_id} viewed {product.name} · ₹{product.price:,.0f}"
            elif event_type == EventType.ADD_TO_CART:
                product.cart_adds += 1
                if product.id not in shopper.cart_items:
                    shopper.cart_items.append(product.id)
                label = "ADDED TO CART"
                detail = f"{shopper.display_id} added {product.name} to cart · ₹{product.price:,.0f}"
            elif event_type == EventType.PRICE_CHECK:
                label = "PRICE CHECK"
                detail = f"{shopper.display_id} checked price on {product.name} (₹{product.price:,.0f})"
            elif event_type == EventType.WISHLIST_ADD:
                product.wishlist_count += 1
                if product.id not in shopper.wishlist_items:
                    shopper.wishlist_items.append(product.id)
                label = "WATCHLIST"
                detail = f"{shopper.display_id} saved {product.name} to watchlist"
            elif event_type == EventType.CART_ABANDON:
                label = "LEFT CART"
                detail = f"{shopper.display_id} left cart ({product.name})"
            elif event_type == EventType.RETURN_VISIT:
                shopper.sessions += 1
                label = "RETURNED"
                detail = f"{shopper.display_id} returned to {product.name}"
            elif event_type == EventType.PRODUCT_COMPARE:
                other = random.choice(products)
                label = "COMPARE"
                detail = f"{shopper.display_id} compared {product.name} vs {other.name}"
            else:
                is_axiom = True
                shopper.hesitation_loop = True
                label = "AXIOM DETECTED HESITATION LOOP"
                detail = f"Shopper {shopper.display_id} on {product.name} · {int(shopper.intent_score * 100)}% Intent"

            event = ShopperEvent(
                shopper_id=shopper.id,
                shopper_display_id=shopper.display_id,
                event_type=event_type,
                label=label,
                detail=detail,
                product_id=product.id,
                product_name=product.name,
                product_price=product.price,
                search_query=query,
                is_axiom_signal=is_axiom,
                metadata={
                    "shopper_display_id": shopper.display_id,
                    "product_price": product.price,
                    "product_category": product.category,
                    "intent_score": shopper.intent_score,
                },
            )
            store.add_event(event)
            shopper.total_events += 1
            shopper.last_seen = datetime.utcnow()
            new_events.append(event)

        return new_events


simulator = Simulator()
event_simulator = simulator
