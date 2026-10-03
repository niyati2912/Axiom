from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


def gen_id() -> str:
    return uuid.uuid4().hex[:12]


class EventType(str, Enum):
    SEARCH = "search"
    PRODUCT_VIEW = "product_view"
    ADD_TO_CART = "add_to_cart"
    REMOVE_FROM_CART = "remove_from_cart"
    PRICE_CHECK = "price_check"
    WISHLIST_ADD = "wishlist_add"
    WISHLIST_REMOVE = "wishlist_remove"
    CHECKOUT_START = "checkout_start"
    CHECKOUT_ABANDON = "checkout_abandon"
    PURCHASE = "purchase"
    CART_ABANDON = "cart_abandon"
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    PRODUCT_COMPARE = "product_compare"
    RETURN_VISIT = "return_visit"
    HESITATION_DETECTED = "hesitation_detected"


class ActionType(str, Enum):
    IN_APP_NUDGE = "in_app_nudge"
    WEBHOOK = "webhook"
    EMAIL_CAMPAIGN = "email_campaign"
    SMS_ALERT = "sms_alert"
    PUSH_NOTIFICATION = "push_notification"
    RE_ENGAGEMENT = "re_engagement"
    DISCOUNT_OFFER = "discount_offer"
    CAMPAIGN = "campaign"


class ActionStatus(str, Enum):
    PENDING = "pending"
    DELIVERED = "delivered"
    CLICKED = "clicked"
    CONVERTED = "converted"
    EXPIRED = "expired"
    FAILED = "failed"


class MarketEventType(str, Enum):
    PRICE_DROP = "price_drop"
    PRICE_INCREASE = "price_increase"
    LOW_STOCK = "low_stock"
    BACK_IN_STOCK = "back_in_stock"
    OUT_OF_STOCK = "out_of_stock"
    NEW_DISCOUNT = "new_discount"
    DISCOUNT_ENDED = "discount_ended"
    COMPETITOR_PRICE_CHANGE = "competitor_price_change"


class OpportunityType(str, Enum):
    HIGH_INTENT_PRICE_DROP = "high_intent_price_drop"
    CART_ABANDON_RECOVERY = "cart_abandon_recovery"
    WISHLIST_PRICE_DROP = "wishlist_price_drop"
    INVENTORY_PRESSURE = "inventory_pressure"
    HESITATION_LOOP = "hesitation_loop"
    RE_ENGAGEMENT = "re_engagement"
    CHECKOUT_RECOVERY = "checkout_recovery"


class Product(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    slug: str = ""
    category: str
    price: float
    original_price: float
    competitor_price: Optional[float] = None
    currency: str = "INR"
    inventory: int
    image_url: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    views: int = 0
    cart_adds: int = 0
    wishlist_count: int = 0
    purchases: int = 0
    conversion_rate: float = 0.0
    price_change_pct: float = 0.0
    recovery_opportunity_level: str = "MEDIUM"
    price_history: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Shopper(BaseModel):
    id: str = Field(default_factory=gen_id)
    display_id: str = ""
    name: Optional[str] = None
    email: Optional[str] = None
    location: str = "Mumbai, IN"
    device: str = "iOS · Safari"
    sessions: int = 1
    session_duration_sec: int = 240
    total_events: int = 0
    cart_items: List[str] = Field(default_factory=list)
    wishlist_items: List[str] = Field(default_factory=list)
    purchase_history: List[str] = Field(default_factory=list)
    primary_product_id: Optional[str] = None
    primary_product_name: Optional[str] = None
    intent_score: float = 0.0
    risk_score: float = 0.0
    confidence: float = 0.0
    hesitation_loop: bool = False
    predicted_next_action: str = "Browsing catalog"
    signal_breakdown: Dict[str, float] = Field(default_factory=dict)
    behavioral_features: Dict[str, Any] = Field(default_factory=dict)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"


class ShopperEvent(BaseModel):
    id: str = Field(default_factory=gen_id)
    shopper_id: str
    shopper_display_id: str = ""
    session_id: str = "sess_live"
    event_type: EventType
    label: str = ""
    detail: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_price: Optional[float] = None
    search_query: Optional[str] = None
    is_axiom_signal: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


class IntentScore(BaseModel):
    shopper_id: str
    shopper_display_id: str = ""
    purchase_intent: float
    drop_off_risk: float
    confidence: float
    hesitation_loop: bool = False
    predicted_next_action: str = ""
    signals: Dict[str, float] = Field(default_factory=dict)
    features: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    top_product_id: Optional[str] = None
    top_product_name: Optional[str] = None


class MarketEvent(BaseModel):
    id: str = Field(default_factory=gen_id)
    product_id: str
    product_name: str
    category: str = ""
    event_type: MarketEventType
    old_value: Optional[float] = None
    new_value: Optional[float] = None
    change_pct: Optional[float] = None
    affected_shoppers: int = 0
    avg_shopper_intent: float = 0.0
    avg_drop_off_risk: float = 0.0
    summary: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Opportunity(BaseModel):
    id: str = Field(default_factory=gen_id)
    title: str = ""
    opportunity_type: OpportunityType
    product_id: str
    product_name: str
    product_price: float = 0.0
    old_price: Optional[float] = None
    price_reduction: Optional[float] = None
    inventory_remaining: Optional[int] = None
    watchlist_count: int = 0
    shopper_ids: List[str] = Field(default_factory=list)
    shopper_count: int = 0
    avg_intent: float = 0.0
    avg_risk: float = 0.0
    revenue_potential: float = 0.0
    trigger: str = ""
    description: str = ""
    recommended_action: str = ""
    action_channel: str = "In-app nudge + Webhook"
    urgency: str = "HIGH"
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RecoveryAction(BaseModel):
    id: str = Field(default_factory=gen_id)
    action_type: ActionType
    action_label: str = ""
    shopper_id: str
    shopper_display_id: str = ""
    product_id: str
    product_name: str
    product_price: float = 0.0
    opportunity_id: Optional[str] = None
    trigger: str = ""
    reason: str = ""
    message: str = ""
    intent_score: float = 0.0
    drop_off_risk: float = 0.0
    status: ActionStatus = ActionStatus.DELIVERED
    result: Optional[str] = None
    revenue_recovered: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    delivered_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Campaign(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    trigger_condition: str
    target_segment: str
    action_type: str
    status: str = "active"
    enrolled_shoppers: int = 0
    actions_sent: int = 0
    conversions: int = 0
    conversion_rate: float = 0.0
    recovered_revenue: float = 0.0
    last_triggered: datetime = Field(default_factory=datetime.utcnow)


class WebhookDelivery(BaseModel):
    id: str = Field(default_factory=gen_id)
    endpoint: str = "POST /webhooks/recovery"
    event_name: str = "recovery.action.triggered"
    shopper_display_id: str = ""
    product_name: str = ""
    status_code: int = 200
    latency_ms: int = 38
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DashboardStats(BaseModel):
    live_shoppers: int = 0
    high_intent_shoppers: int = 0
    revenue_at_risk: float = 0.0
    recovery_opportunities: int = 0
    actions_triggered: int = 0
    recovered_revenue: float = 0.0
    active_market_events: int = 0
    total_events: int = 0
    conversion_rate: float = 0.0
    avg_intent_score: float = 0.0
    hesitation_loops_active: int = 0
    webhooks_Dispatched: int = 0
