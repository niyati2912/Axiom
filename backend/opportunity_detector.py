"""Opportunity detection and autonomous action execution engine."""
from __future__ import annotations
import random
from datetime import datetime
from typing import Optional, Tuple, List
from .models import (
    Opportunity, OpportunityType, MarketEventType,
    RecoveryAction, ActionType, ActionStatus, WebhookDelivery
)
from .store import store


class OpportunityDetector:
    INTENT_THRESHOLD = 0.65

    def detect_opportunities(self) -> Tuple[List[Opportunity], List[RecoveryAction]]:
        new_opps: List[Opportunity] = []
        new_actions: List[RecoveryAction] = []

        recent_market = store.get_market_events(limit=6)
        for m in recent_market[:2]:
            if (datetime.utcnow() - m.timestamp).total_seconds() > 35:
                continue
            product = store.get_product(m.product_id)
            if not product:
                continue

            interested = [
                s for s in store.get_all_shoppers()
                if s.status == "active"
                and s.intent_score >= self.INTENT_THRESHOLD
                and (product.id in s.cart_items or product.id in s.wishlist_items or s.primary_product_id == product.id)
            ]
            if not interested:
                continue

            avg_intent = round(sum(s.intent_score for s in interested) / len(interested), 2)
            avg_risk = round(sum(s.risk_score for s in interested) / len(interested), 2)
            count = max(len(interested), m.affected_shoppers)

            if m.event_type in (MarketEventType.PRICE_DROP, MarketEventType.NEW_DISCOUNT):
                red = round((m.old_value or product.original_price) - (m.new_value or product.price))
                opp = Opportunity(
                    title="HIGH INTENT + PRICE DROP",
                    opportunity_type=OpportunityType.HIGH_INTENT_PRICE_DROP,
                    product_id=product.id,
                    product_name=product.name,
                    product_price=product.price,
                    old_price=m.old_value or product.original_price,
                    price_reduction=max(red, 0),
                    inventory_remaining=product.inventory,
                    watchlist_count=product.wishlist_count,
                    shopper_ids=[s.id for s in interested[:8]],
                    shopper_count=count,
                    avg_intent=avg_intent,
                    avg_risk=avg_risk,
                    revenue_potential=round(count * product.price, 2),
                    trigger=f"Price dropped {abs(m.change_pct or 10):.1f}% (₹{red:,.0f} reduction)",
                    description=f"{count} shoppers with {int(avg_intent * 100)}% average intent watching {product.name} after ₹{red:,.0f} price reduction.",
                    recommended_action="Notify high-intent abandoned carts",
                    action_channel="In-app nudge + Webhook",
                    urgency="HIGH",
                )
            else:
                opp = Opportunity(
                    title="INVENTORY PRESSURE",
                    opportunity_type=OpportunityType.INVENTORY_PRESSURE,
                    product_id=product.id,
                    product_name=product.name,
                    product_price=product.price,
                    old_price=product.original_price,
                    price_reduction=0,
                    inventory_remaining=product.inventory,
                    watchlist_count=product.wishlist_count,
                    shopper_ids=[s.id for s in interested[:8]],
                    shopper_count=count,
                    avg_intent=avg_intent,
                    avg_risk=avg_risk,
                    revenue_potential=round(min(count, max(product.inventory, 5)) * product.price, 2),
                    trigger=f"Inventory: {product.inventory} remaining · Watchlist: {product.wishlist_count}",
                    description=f"Potential urgency opportunity on {product.name}: {product.inventory} remaining with {count} high-intent shoppers.",
                    recommended_action="Dispatch scarcity alert to high-intent watchlist",
                    action_channel="In-app urgency nudge",
                    urgency="HIGH",
                )

            saved_opp = store.add_opportunity(opp)
            new_opps.append(saved_opp)

            # Auto-generate 1 autonomous action per cycle
            actions = self._generate_actions(saved_opp, max_targets=1)
            for act in actions:
                store.add_action(act)
                new_actions.append(act)

        store.update_stats()
        return new_opps, new_actions

    def activate_opportunity(self, opportunity_id: str) -> dict:
        """Manually or autonomously activate an opportunity and dispatch actions + webhooks."""
        opp = store.get_opportunity(opportunity_id)
        if not opp:
            return {"error": "Opportunity not found"}

        opp.status = "activated"
        actions = self._generate_actions(opp, max_targets=3, force_converted=True)
        for act in actions:
            store.add_action(act)

        if store.campaigns:
            store.campaigns[0].actions_sent += len(actions)
            store.campaigns[0].conversions += 1
            store.campaigns[0].recovered_revenue += opp.product_price
            store.campaigns[0].last_triggered = datetime.utcnow()

        store.update_stats()
        return {
            "opportunity": opp.model_dump(mode="json"),
            "actions_triggered": [a.model_dump(mode="json") for a in actions],
            "stats": store.stats.model_dump(mode="json"),
        }

    def _generate_actions(
        self, opportunity: Opportunity, max_targets: int = 2, force_converted: bool = False
    ) -> List[RecoveryAction]:
        actions: List[RecoveryAction] = []
        product = store.get_product(opportunity.product_id)
        price = product.price if product else (opportunity.product_price or 3899)

        target_ids = opportunity.shopper_ids[:max_targets]
        if not target_ids:
            all_active = [s for s in store.get_all_shoppers() if s.intent_score >= 0.7]
            target_ids = [s.id for s in all_active[:max_targets]]

        for idx, sid in enumerate(target_ids):
            shopper = store.get_shopper(sid)
            if not shopper:
                continue

            if opportunity.opportunity_type == OpportunityType.HIGH_INTENT_PRICE_DROP:
                act_type = ActionType.IN_APP_NUDGE if idx == 0 else ActionType.WEBHOOK
                act_label = "In-app price-drop nudge" if idx == 0 else "POST /webhooks/recovery"
                msg = f"{opportunity.product_name} is now ₹{price:,.0f}."
            elif opportunity.opportunity_type == OpportunityType.INVENTORY_PRESSURE:
                act_type = ActionType.IN_APP_NUDGE
                act_label = "Inventory urgency nudge"
                msg = f"Only {opportunity.inventory_remaining or 12} {opportunity.product_name} units remaining."
            else:
                act_type = ActionType.RE_ENGAGEMENT
                act_label = "Hesitation recovery nudge"
                msg = f"Complete your order for {opportunity.product_name} at ₹{price:,.0f}."

            status = (
                ActionStatus.CONVERTED
                if (force_converted and idx == 0)
                else random.choices(
                    [ActionStatus.DELIVERED, ActionStatus.CONVERTED, ActionStatus.CLICKED],
                    weights=[0.45, 0.30, 0.25],
                )[0]
            )
            res_map = {
                ActionStatus.DELIVERED: "Checkout resumed",
                ActionStatus.CLICKED: "Shopper clicked nudge · in checkout",
                ActionStatus.CONVERTED: f"Order completed · ₹{price:,.0f} recovered",
            }
            rev = price if status == ActionStatus.CONVERTED else (round(price * 0.5) if status == ActionStatus.DELIVERED else 0.0)

            act = RecoveryAction(
                action_type=act_type,
                action_label=act_label,
                shopper_id=shopper.id,
                shopper_display_id=shopper.display_id,
                product_id=opportunity.product_id,
                product_name=opportunity.product_name,
                product_price=price,
                opportunity_id=opportunity.id,
                trigger=opportunity.trigger,
                reason=opportunity.description,
                message=msg,
                intent_score=shopper.intent_score,
                drop_off_risk=shopper.risk_score,
                status=status,
                result=res_map.get(status, "Delivered"),
                revenue_recovered=rev,
                delivered_at=datetime.utcnow(),
            )
            actions.append(act)

            wh = WebhookDelivery(
                endpoint="POST /webhooks/recovery",
                event_name=f"axiom.recovery.{act_type.value}",
                shopper_display_id=shopper.display_id,
                product_name=opportunity.product_name,
                status_code=200,
                latency_ms=random.randint(24, 58),
                payload={
                    "action_id": act.id,
                    "shopper": shopper.display_id,
                    "product": opportunity.product_name,
                    "price_inr": price,
                    "intent_score": shopper.intent_score,
                    "drop_off_risk": shopper.risk_score,
                    "trigger": opportunity.trigger,
                    "message": msg,
                },
            )
            store.add_webhook(wh)

        return actions


opportunity_detector = OpportunityDetector()
