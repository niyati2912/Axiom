export interface PriceHistoryPoint {
  price: number;
  date: string;
  event?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  original_price: number;
  competitor_price?: number;
  currency: string;
  inventory: number;
  brand?: string;
  description?: string;
  views: number;
  cart_adds: number;
  wishlist_count: number;
  purchases: number;
  conversion_rate: number;
  price_change_pct: number;
  recovery_opportunity_level: "HIGH" | "MEDIUM" | "LOW" | string;
  interested_shoppers?: number;
  high_intent_shoppers?: number;
  intent_density?: number;
  price_history: PriceHistoryPoint[];
}

export interface Shopper {
  id: string;
  display_id: string;
  name: string;
  email: string;
  location: string;
  device: string;
  sessions: number;
  session_duration_sec: number;
  total_events: number;
  cart_items: string[];
  wishlist_items: string[];
  purchase_history: string[];
  primary_product_id?: string;
  primary_product_name?: string;
  intent_score: number;
  risk_score: number;
  confidence: number;
  hesitation_loop: boolean;
  predicted_next_action: string;
  signal_breakdown: Record<string, number>;
  behavioral_features: Record<string, number>;
  last_seen: string;
  first_seen: string;
  status: string;
}

export interface ShopperEvent {
  id: string;
  shopper_id: string;
  shopper_display_id: string;
  session_id?: string;
  event_type: string;
  label: string;
  detail: string;
  timestamp: string;
  product_id?: string;
  product_name?: string;
  product_price?: number;
  search_query?: string;
  is_axiom_signal?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MarketEvent {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  event_type: string;
  old_value?: number;
  new_value?: number;
  change_pct?: number;
  affected_shoppers: number;
  avg_shopper_intent: number;
  avg_drop_off_risk: number;
  summary: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Opportunity {
  id: string;
  title: string;
  opportunity_type: string;
  product_id: string;
  product_name: string;
  product_price: number;
  old_price?: number;
  price_reduction?: number;
  inventory_remaining?: number;
  watchlist_count: number;
  shopper_ids: string[];
  shopper_count: number;
  avg_intent: number;
  avg_risk: number;
  revenue_potential: number;
  trigger: string;
  description: string;
  recommended_action: string;
  action_channel: string;
  urgency: string;
  status: "active" | "activated" | string;
  created_at: string;
}

export interface RecoveryAction {
  id: string;
  action_type: string;
  action_label: string;
  shopper_id: string;
  shopper_display_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  opportunity_id?: string;
  trigger: string;
  reason: string;
  message: string;
  intent_score: number;
  drop_off_risk: number;
  status: "delivered" | "converted" | "clicked" | "pending" | string;
  result?: string;
  revenue_recovered: number;
  created_at: string;
  delivered_at?: string;
}

export interface Campaign {
  id: string;
  name: string;
  trigger_condition: string;
  target_segment: string;
  action_type: string;
  status: "active" | "paused" | string;
  enrolled_shoppers: number;
  actions_sent: number;
  conversions: number;
  conversion_rate: number;
  recovered_revenue: number;
  last_triggered: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint: string;
  event_name: string;
  shopper_display_id: string;
  product_name: string;
  status_code: number;
  latency_ms: number;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface DashboardStats {
  live_shoppers: number;
  high_intent_shoppers: number;
  revenue_at_risk: number;
  recovery_opportunities: number;
  actions_triggered: number;
  recovered_revenue: number;
  active_market_events: number;
  total_events: number;
  conversion_rate: number;
  avg_intent_score: number;
  hesitation_loops_active: number;
  webhooks_Dispatched: number;
}

export interface AxiomSnapshot {
  stats: DashboardStats;
  events: ShopperEvent[];
  shoppers: Shopper[];
  products: Product[];
  opportunities: Opportunity[];
  market_events: MarketEvent[];
  actions: RecoveryAction[];
  campaigns: Campaign[];
  webhooks: WebhookDelivery[];
}

export type WorkspaceSection =
  | "overview"
  | "signals"
  | "shoppers"
  | "products"
  | "intent"
  | "opportunities"
  | "market"
  | "actions"
  | "campaigns"
  | "webhooks"
  | "analytics"
  | "settings";
