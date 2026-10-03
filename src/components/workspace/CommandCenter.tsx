"use client";

import React, { useState } from "react";
import {
  Activity,
  Users,
  Package,
  Cpu,
  Sparkles,
  Radar,
  Zap,
  Megaphone,
  Webhook,
  BarChart3,
  Settings,
  ArrowLeft,
  CheckCircle2,
  Play,
  RefreshCw,
  Send,
  TrendingDown,
  AlertTriangle,
  Clock,
  ChevronRight,
  Sliders,
} from "lucide-react";
import {
  AxiomSnapshot,
  WorkspaceSection,
  Shopper,
  Product,
  Opportunity,
} from "@/types/axiom";
import {
  formatINR,
  formatCompactINR,
  formatClockTime,
} from "@/lib/api";
import CommerceNetwork3D from "@/components/three/CommerceNetwork3D";

interface CommandCenterProps {
  snapshot: AxiomSnapshot;
  activeSection: WorkspaceSection;
  selectedShopperId: string;
  onSelectSection: (section: WorkspaceSection) => void;
  onSelectShopper: (shopperId: string) => void;
  onBackToLanding: () => void;
  onActivateOpportunity: (oppId: string) => Promise<void>;
  onIngestEvent: (shopperId: string, eventType: string, productId?: string, query?: string) => Promise<void>;
  onSimulateMarketEvent: (productId: string, eventType: string, newValue?: number) => Promise<void>;
  onToggleCampaign: (campaignId: string) => Promise<void>;
  onSendTestWebhook: () => Promise<void>;
  isLiveConnected: boolean;
}

const NAV_ITEMS: { id: WorkspaceSection; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "signals", label: "Live Signals", icon: Zap, badge: "LIVE" },
  { id: "shoppers", label: "Shoppers", icon: Users },
  { id: "products", label: "Products", icon: Package },
  { id: "intent", label: "Intent Engine", icon: Cpu },
  { id: "opportunities", label: "Opportunities", icon: Sparkles },
  { id: "market", label: "Market Monitor", icon: Radar },
  { id: "actions", label: "Actions", icon: CheckCircle2 },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function CommandCenter({
  snapshot,
  activeSection,
  selectedShopperId,
  onSelectSection,
  onSelectShopper,
  onBackToLanding,
  onActivateOpportunity,
  onIngestEvent,
  onSimulateMarketEvent,
  onToggleCampaign,
  onSendTestWebhook,
  isLiveConnected,
}: CommandCenterProps) {
  const [signalFilter, setSignalFilter] = useState<string>("all");
  const [simShopperId, setSimShopperId] = useState<string>("shopper_4821");
  const [simEventType, setSimEventType] = useState<string>("price_check");
  const [simProductId, setSimProductId] = useState<string>("prod_black_denim");
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interactive What-If Intent Scorer state for the Intent Engine tab
  const [whatIfSignals, setWhatIfSignals] = useState({
    repeatedViews: 4,
    cartAdded: true,
    priceChecks: 3,
    returnedSession: true,
    checkoutHesitation: true,
    watchlistSaved: true,
  });

  // Settings thresholds
  const [intentThreshold, setIntentThreshold] = useState<number>(75);
  const [riskThreshold, setRiskThreshold] = useState<number>(60);
  const [autonomousMode, setAutonomousMode] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const selectedShopper: Shopper =
    snapshot.shoppers.find(
      (s) => s.id === selectedShopperId || s.display_id === selectedShopperId
    ) || snapshot.shoppers[0];

  const shopperEvents = snapshot.events.filter(
    (e) =>
      e.shopper_id === selectedShopper?.id ||
      e.shopper_display_id === selectedShopper?.display_id
  );

  const shopperActions = snapshot.actions.filter(
    (a) =>
      a.shopper_id === selectedShopper?.id ||
      a.shopper_display_id === selectedShopper?.display_id
  );

  const shopperOpportunities = snapshot.opportunities.filter(
    (o) =>
      o.shopper_ids.includes(selectedShopper?.id) ||
      o.product_id === selectedShopper?.primary_product_id
  );

  // Compute interactive What-If score
  const whatIfBreakdown = {
    "Repeated product views": Math.min(26, whatIfSignals.repeatedViews * 4.5),
    "Added to cart": whatIfSignals.cartAdded ? 27 : 0,
    "Price checks": Math.min(24, whatIfSignals.priceChecks * 7),
    "Returned session": whatIfSignals.returnedSession ? 14 : 0,
    "Checkout hesitation": whatIfSignals.checkoutHesitation ? 11 : 0,
    "Watchlist activity": whatIfSignals.watchlistSaved ? 9 : 0,
  };
  const whatIfTotalPts = Object.values(whatIfBreakdown).reduce((a, b) => a + b, 0);
  const whatIfIntentPct = Math.min(98, Math.max(12, Math.round(whatIfTotalPts)));
  const whatIfRiskPct = Math.min(
    94,
    Math.round(
      24 +
        (whatIfSignals.checkoutHesitation ? 28 : 0) +
        whatIfSignals.priceChecks * 8 +
        (whatIfSignals.cartAdded ? 6 : 0)
    )
  );

  const handleActivate = async (opp: Opportunity) => {
    setActivatingId(opp.id);
    await onActivateOpportunity(opp.id);
    setActivatingId(null);
    showToast(
      `Activated recovery for ${opp.product_name} · Dispatched nudge & webhook to ${opp.shopper_count} high-intent shoppers.`
    );
  };

  return (
    <div className="min-h-screen bg-axiom-bg text-axiom-ink flex flex-col lg:flex-row">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md rounded-xl border border-axiom-ink bg-axiom-ink px-4 py-3 text-xs text-white shadow-floating flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-axiom-green shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================
          LEFT SIDEBAR NAVIGATION
      ============================================================ */}
      <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-axiom-line bg-axiom-paper flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-axiom-softline">
            <button
              type="button"
              onClick={onBackToLanding}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="flex items-end gap-0.5 h-5 w-5">
                <span className="w-1.5 h-2.5 bg-axiom-ink rounded-[1px]" />
                <span className="w-1.5 h-3.5 bg-axiom-ink rounded-[1px]" />
                <span className="w-1.5 h-5 bg-axiom-blue rounded-[1px]" />
              </div>
              <div>
                <span className="font-display text-base font-bold tracking-tight text-axiom-ink block leading-none">
                  AXIOM
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-axiom-muted">
                  AUTONOMOUS ENGINE
                </span>
              </div>
            </button>
            <span className="inline-flex items-center gap-1 rounded-full bg-axiom-greensoft px-2 py-0.5 font-mono text-[10px] font-semibold text-axiom-green">
              <span className="h-1.5 w-1.5 rounded-full bg-axiom-green animate-pulse" />
              {isLiveConnected ? "LIVE" : "SYNC"}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const countBadge =
                item.id === "opportunities"
                  ? snapshot.opportunities.filter((o) => o.status === "active").length
                  : item.id === "actions"
                  ? snapshot.actions.length
                  : null;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSection(item.id)}
                  className={`flex items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-axiom-ink text-white shadow-subtle"
                      : "text-axiom-muted hover:bg-axiom-surface hover:text-axiom-ink"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? "text-white" : "text-axiom-muted"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold ${
                        isActive
                          ? "bg-axiom-blue text-white"
                          : "bg-axiom-bluesoft text-axiom-blue"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {countBadge !== null && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-axiom-surface text-axiom-ink"
                      }`}
                    >
                      {countBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Loop Indicator */}
        <div className="hidden lg:block p-4 border-t border-axiom-softline">
          <div className="rounded-xl border border-axiom-line bg-axiom-bg p-3">
            <div className="flex items-center justify-between font-mono text-[10px] text-axiom-muted">
              <span>AUTONOMOUS MODE</span>
              <span className="text-axiom-green font-semibold">ACTIVE</span>
            </div>
            <div className="mt-2 font-mono text-[11px] text-axiom-ink font-semibold">
              {formatINR(snapshot.stats.recovered_revenue)} Recovered
            </div>
            <button
              type="button"
              onClick={onBackToLanding}
              className="mt-2.5 flex items-center gap-1.5 font-mono text-[11px] text-axiom-muted hover:text-axiom-ink"
            >
              <ArrowLeft className="h-3 w-3" />
              Editorial Story View
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================
          MAIN COMMAND CENTER WORKSPACE
      ============================================================ */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1440px]">
        {/* Top Context Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-axiom-line pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-axiom-muted">
              <span>AXIOM COMMAND CENTER</span>
              <span>/</span>
              <span className="text-axiom-blue font-semibold">{activeSection}</span>
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-axiom-ink">
              {activeSection === "overview" && "What is happening right now."}
              {activeSection === "signals" && "Live Behavioral Signal Stream"}
              {activeSection === "shoppers" && "Shopper Intelligence & Behavioral Timelines"}
              {activeSection === "products" && "Product Intent Density & Catalog Radar"}
              {activeSection === "intent" && "Purchase-Intent & Drop-Off Risk Engine"}
              {activeSection === "opportunities" && "Revenue Recovery Opportunities"}
              {activeSection === "market" && "Live Market & Inventory Monitor"}
              {activeSection === "actions" && "Autonomous Actions Ledger"}
              {activeSection === "campaigns" && "Autonomous Recovery Playbooks"}
              {activeSection === "webhooks" && "Webhook Outbox & Event Payloads"}
              {activeSection === "analytics" && "Closed-Loop Revenue Attribution"}
              {activeSection === "settings" && "Engine Thresholds & Architecture"}
            </h1>
          </div>

          {/* Live System Status Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-xl border border-axiom-line bg-axiom-paper px-3.5 py-2 flex items-center gap-4 font-mono text-xs">
              <div>
                <span className="text-[10px] text-axiom-muted block">LIVE SHOPPERS</span>
                <strong className="text-axiom-ink">{snapshot.stats.live_shoppers}</strong>
              </div>
              <div className="h-6 w-[1px] bg-axiom-softline" />
              <div>
                <span className="text-[10px] text-axiom-muted block">HIGH INTENT</span>
                <strong className="text-axiom-blue">{snapshot.stats.high_intent_shoppers}</strong>
              </div>
              <div className="h-6 w-[1px] bg-axiom-softline" />
              <div>
                <span className="text-[10px] text-axiom-muted block">AT RISK</span>
                <strong className="text-axiom-red">
                  {formatCompactINR(snapshot.stats.revenue_at_risk)}
                </strong>
              </div>
              <div className="h-6 w-[1px] bg-axiom-softline" />
              <div>
                <span className="text-[10px] text-axiom-muted block">RECOVERED</span>
                <strong className="text-axiom-green">
                  {formatINR(snapshot.stats.recovered_revenue)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            VIEW 01: OVERVIEW
        ============================================================ */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            {/* Top Row: Live Event Stream + 3D System Topology */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Live Event Telemetry Column */}
              <div className="xl:col-span-5 rounded-2xl border border-axiom-line bg-axiom-paper p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-axiom-softline pb-3 mb-4">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
                        REAL-TIME TELEMETRY
                      </span>
                      <h2 className="font-display text-base font-bold text-axiom-ink">
                        Live Shopper Micro-Behaviors
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectSection("signals")}
                      className="font-mono text-[11px] text-axiom-blue hover:underline"
                    >
                      Full Stream →
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                    {snapshot.events.slice(0, 8).map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => {
                          onSelectShopper(evt.shopper_id);
                          onSelectSection("shoppers");
                        }}
                        className={`cursor-pointer rounded-xl border px-3.5 py-2.5 transition-colors ${
                          evt.is_axiom_signal
                            ? "border-axiom-blue bg-axiom-bluesoft/55"
                            : "border-axiom-softline bg-axiom-bg/60 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-axiom-muted">
                            {formatClockTime(evt.timestamp)}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              evt.is_axiom_signal
                                ? "bg-axiom-blue text-white"
                                : "bg-axiom-surface text-axiom-ink"
                            }`}
                          >
                            {evt.label}
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-medium text-axiom-ink">
                          {evt.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Live Action Bar */}
                <div className="mt-4 pt-3 border-t border-axiom-softline flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-axiom-muted">
                    Click any event to inspect shopper timeline
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await onIngestEvent("shopper_4821", "price_check", "prod_black_denim");
                      showToast("Simulated live price check for Shopper #4821 on Black Denim");
                    }}
                    className="rounded-lg bg-axiom-surface px-2.5 py-1 font-mono text-[11px] font-medium text-axiom-ink hover:bg-axiom-ink hover:text-white transition-colors"
                  >
                    + Pulse Event
                  </button>
                </div>
              </div>

              {/* 3D System Network Map */}
              <div className="xl:col-span-7">
                <CommerceNetwork3D
                  compact
                  activeEventLabel={snapshot.events[0]?.label || "HESITATION LOOP DETECTED"}
                  intentScorePct={91}
                  onSelectNode={(node) => {
                    if (node.id === "shopper") {
                      onSelectShopper("shopper_4821");
                      onSelectSection("shoppers");
                    } else if (node.id === "market") {
                      onSelectSection("market");
                    } else if (node.id === "recovery") {
                      onSelectSection("actions");
                    } else if (node.id === "intent") {
                      onSelectSection("intent");
                    }
                  }}
                />
              </div>
            </div>

            {/* Middle Row: Active Recovery Opportunities + Intent Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Recovery Opportunities Panel */}
              <div className="lg:col-span-7 rounded-2xl border border-axiom-line bg-axiom-paper p-5">
                <div className="flex items-center justify-between border-b border-axiom-softline pb-3 mb-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-blue font-semibold">
                      OPPORTUNITY ENGINE
                    </span>
                    <h2 className="font-display text-base font-bold text-axiom-ink">
                      High-Value Recovery Opportunities
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectSection("opportunities")}
                    className="font-mono text-[11px] text-axiom-blue hover:underline"
                  >
                    All Opportunities ({snapshot.opportunities.length}) →
                  </button>
                </div>

                <div className="space-y-3">
                  {snapshot.opportunities.slice(0, 3).map((opp) => (
                    <div
                      key={opp.id}
                      className="rounded-xl border border-axiom-line bg-axiom-bg/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-axiom-bluesoft px-2 py-0.5 font-mono text-[10px] font-semibold text-axiom-blue">
                            {opp.title}
                          </span>
                          <span className="font-mono text-xs text-axiom-muted">
                            {opp.shopper_count} shoppers · {Math.round(opp.avg_intent * 100)}% avg intent
                          </span>
                        </div>
                        <div className="mt-1.5 font-display text-base font-bold text-axiom-ink">
                          {opp.product_name} · {formatINR(opp.product_price)}
                        </div>
                        <p className="mt-0.5 text-xs text-axiom-muted">{opp.trigger}</p>
                        <div className="mt-2 font-mono text-[11px] text-axiom-ink">
                          Recommended: <span className="text-axiom-blue">{opp.recommended_action}</span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end gap-2 shrink-0">
                        <div className="text-right">
                          <span className="font-mono text-[10px] text-axiom-muted block">
                            RECOVERABLE
                          </span>
                          <strong className="font-display text-base text-axiom-green">
                            {formatINR(opp.revenue_potential)}
                          </strong>
                        </div>
                        <button
                          type="button"
                          disabled={activatingId === opp.id}
                          onClick={() => handleActivate(opp)}
                          className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors ${
                            opp.status === "activated"
                              ? "bg-axiom-greensoft text-axiom-green"
                              : "bg-axiom-ink text-white hover:bg-axiom-blue"
                          }`}
                        >
                          {opp.status === "activated"
                            ? "✓ ACTIVATED"
                            : activatingId === opp.id
                            ? "DISPATCHING..."
                            : "[ ACTIVATE ]"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Intent Distribution & Market Radar Summary */}
              <div className="lg:col-span-5 space-y-6">
                {/* Intent Distribution */}
                <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5">
                  <div className="flex items-center justify-between border-b border-axiom-softline pb-3 mb-4">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
                        INTENT ENGINE TELEMETRY
                      </span>
                      <h2 className="font-display text-base font-bold text-axiom-ink">
                        Live Shopper Intent Distribution
                      </h2>
                    </div>
                    <span className="font-mono text-xs text-axiom-blue font-semibold">
                      Avg {Math.round(snapshot.stats.avg_intent_score * 100)}%
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { tier: "Critical Recovery (80–100%)", count: 16, pct: 68, color: "bg-axiom-blue" },
                      { tier: "High Intent (65–80%)", count: 19, pct: 80, color: "bg-axiom-ink" },
                      { tier: "Evaluating (40–65%)", count: 18, pct: 74, color: "bg-axiom-amber" },
                      { tier: "Early Discovery (0–40%)", count: 11, pct: 45, color: "bg-axiom-muted" },
                    ].map((row) => (
                      <div key={row.tier} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-axiom-ink font-medium">{row.tier}</span>
                          <span className="font-mono text-axiom-muted">{row.count} shoppers</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-axiom-surface overflow-hidden">
                          <div
                            className={`h-full rounded-full ${row.color}`}
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Autonomous Actions */}
                <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5">
                  <div className="flex items-center justify-between border-b border-axiom-softline pb-3 mb-3">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-green font-semibold">
                        AUTONOMOUS EXECUTION
                      </span>
                      <h2 className="font-display text-base font-bold text-axiom-ink">
                        Latest Triggered Actions
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectSection("actions")}
                      className="font-mono text-[11px] text-axiom-blue hover:underline"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {snapshot.actions.slice(0, 3).map((act) => (
                      <div
                        key={act.id}
                        className="rounded-xl border border-axiom-softline bg-axiom-bg/50 px-3.5 py-2.5 text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-axiom-ink">
                            {act.shopper_display_id} · {act.product_name}
                          </div>
                          <div className="text-[11px] text-axiom-muted">
                            {act.action_label} · {act.result}
                          </div>
                        </div>
                        <span className="rounded bg-axiom-greensoft px-2 py-0.5 font-mono text-[10px] font-semibold text-axiom-green uppercase">
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 02: LIVE SIGNALS
        ============================================================ */}
        {activeSection === "signals" && (
          <div className="space-y-6">
            {/* Interactive Telemetry Injector */}
            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-blue font-semibold">
                    LIVE TELEMETRY INGESTION (`POST /api/events/ingest`)
                  </span>
                  <h2 className="font-display text-base font-bold text-axiom-ink">
                    Simulate Real-Time Shopper Micro-Behavior
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={simShopperId}
                    onChange={(e) => setSimShopperId(e.target.value)}
                    className="rounded-xl border border-axiom-line bg-white px-3 py-2 text-xs font-mono text-axiom-ink"
                  >
                    {snapshot.shoppers.slice(0, 10).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_id} · {s.name} ({Math.round(s.intent_score * 100)}%)
                      </option>
                    ))}
                  </select>

                  <select
                    value={simEventType}
                    onChange={(e) => setSimEventType(e.target.value)}
                    className="rounded-xl border border-axiom-line bg-white px-3 py-2 text-xs font-mono text-axiom-ink"
                  >
                    <option value="search">SEARCH</option>
                    <option value="product_view">PRODUCT VIEW</option>
                    <option value="add_to_cart">ADD TO CART</option>
                    <option value="price_check">PRICE CHECK</option>
                    <option value="cart_abandon">LEFT CART</option>
                    <option value="return_visit">RETURNED SESSION</option>
                    <option value="hesitation_detected">HESITATION LOOP</option>
                  </select>

                  <select
                    value={simProductId}
                    onChange={(e) => setSimProductId(e.target.value)}
                    className="rounded-xl border border-axiom-line bg-white px-3 py-2 text-xs font-mono text-axiom-ink"
                  >
                    {snapshot.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatINR(p.price)})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={async () => {
                      await onIngestEvent(simShopperId, simEventType, simProductId);
                      showToast(`Ingested ${simEventType.toUpperCase()} event into Axiom engine`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-axiom-ink px-4 py-2 text-xs font-semibold text-white hover:bg-axiom-blue transition-colors"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Emit Live Signal
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "All Signals" },
                { id: "axiom", label: "Axiom Detections" },
                { id: "search", label: "Searches" },
                { id: "product_view", label: "Product Views" },
                { id: "add_to_cart", label: "Cart Additions" },
                { id: "price_check", label: "Price Checks" },
                { id: "cart_abandon", label: "Cart Abandonments" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSignalFilter(tab.id)}
                  className={`rounded-xl px-3.5 py-1.5 font-mono text-xs transition-colors ${
                    signalFilter === tab.id
                      ? "bg-axiom-ink text-white"
                      : "border border-axiom-line bg-axiom-paper text-axiom-muted hover:text-axiom-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Stream List */}
            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-6">
              <div className="space-y-3">
                {snapshot.events
                  .filter((e) => {
                    if (signalFilter === "all") return true;
                    if (signalFilter === "axiom") return e.is_axiom_signal;
                    return e.event_type === signalFilter;
                  })
                  .map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => {
                        onSelectShopper(evt.shopper_id);
                        onSelectSection("shoppers");
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        evt.is_axiom_signal
                          ? "border-axiom-blue bg-axiom-bluesoft/50"
                          : "border-axiom-softline bg-axiom-bg/40 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <span className="font-mono text-xs text-axiom-muted w-20 shrink-0">
                          {formatClockTime(evt.timestamp)}
                        </span>
                        <span
                          className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold uppercase shrink-0 ${
                            evt.is_axiom_signal
                              ? "bg-axiom-blue text-white"
                              : evt.event_type === "cart_abandon"
                              ? "bg-axiom-redsoft text-axiom-red"
                              : evt.event_type === "add_to_cart"
                              ? "bg-axiom-greensoft text-axiom-green"
                              : "bg-axiom-surface text-axiom-ink"
                          }`}
                        >
                          {evt.label}
                        </span>
                        <div>
                          <div className="font-display text-sm font-bold text-axiom-ink">
                            {evt.detail}
                          </div>
                          {evt.product_name && (
                            <div className="text-xs text-axiom-muted">
                              Product: {evt.product_name}{" "}
                              {evt.product_price ? `· ${formatINR(evt.product_price)}` : ""}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center font-mono text-xs text-axiom-blue">
                        <span>Inspect {evt.shopper_display_id}</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 03: SHOPPERS & BEHAVIORAL TIMELINE DETAIL
        ============================================================ */}
        {activeSection === "shoppers" && selectedShopper && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Shopper Directory */}
            <div className="lg:col-span-4 rounded-2xl border border-axiom-line bg-axiom-paper p-4">
              <div className="flex items-center justify-between border-b border-axiom-softline pb-3 mb-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
                  ACTIVE SHOPPER SESSIONS ({snapshot.shoppers.length})
                </span>
                <span className="font-mono text-[10px] text-axiom-blue">SORTED BY INTENT</span>
              </div>

              <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                {snapshot.shoppers.map((s) => {
                  const isSel = s.id === selectedShopper.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelectShopper(s.id)}
                      className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                        isSel
                          ? "border-axiom-ink bg-axiom-ink text-white"
                          : "border-axiom-softline bg-axiom-bg/50 hover:bg-white text-axiom-ink"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold">
                            {s.display_id}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              isSel ? "text-neutral-200" : "text-axiom-muted"
                            }`}
                          >
                            {s.name}
                          </span>
                        </div>
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                            isSel
                              ? "bg-axiom-blue text-white"
                              : s.intent_score >= 0.8
                              ? "bg-axiom-bluesoft text-axiom-blue"
                              : "bg-axiom-surface text-axiom-ink"
                          }`}
                        >
                          {Math.round(s.intent_score * 100)}% INTENT
                        </span>
                      </div>
                      <div
                        className={`mt-1.5 flex items-center justify-between font-mono text-[11px] ${
                          isSel ? "text-neutral-300" : "text-axiom-muted"
                        }`}
                      >
                        <span>{s.primary_product_name || "Catalog"}</span>
                        <span>
                          Risk {Math.round(s.risk_score * 100)}%{" "}
                          {s.hesitation_loop ? "· ● LOOP" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Rich Shopper Behavioral Timeline & Intelligence */}
            <div className="lg:col-span-8 space-y-6">
              {/* Identity + Scores Header Card */}
              <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-axiom-softline pb-5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-md bg-axiom-ink px-2.5 py-1 font-mono text-xs font-bold text-white">
                        SHOPPER {selectedShopper.display_id}
                      </span>
                      {selectedShopper.hesitation_loop && (
                        <span className="rounded-md bg-axiom-redsoft px-2.5 py-1 font-mono text-xs font-semibold text-axiom-red">
                          HESITATION LOOP DETECTED
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 font-display text-2xl font-bold text-axiom-ink">
                      {selectedShopper.name}
                    </h2>
                    <p className="font-mono text-xs text-axiom-muted">
                      {selectedShopper.email} · {selectedShopper.location} ·{" "}
                      {selectedShopper.device} · {selectedShopper.sessions} sessions (
                      {Math.round(selectedShopper.session_duration_sec / 60)}m active)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await onIngestEvent(
                        selectedShopper.id,
                        "price_check",
                        selectedShopper.primary_product_id || "prod_black_denim"
                      );
                      showToast(`Triggered live behavioral check for ${selectedShopper.display_id}`);
                    }}
                    className="rounded-xl bg-axiom-blue px-4 py-2.5 text-xs font-semibold text-white hover:bg-axiom-ink transition-colors"
                  >
                    Trigger Recovery Nudge
                  </button>
                </div>

                {/* 3 Core Scores */}
                <div className="grid grid-cols-3 gap-4 py-5 border-b border-axiom-softline">
                  <div>
                    <span className="font-mono text-[10px] uppercase text-axiom-muted">
                      PURCHASE INTENT SCORE
                    </span>
                    <div className="mt-1 font-display text-4xl font-bold text-axiom-blue">
                      {Math.round(selectedShopper.intent_score * 100)}%
                    </div>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-axiom-muted">
                      DROP-OFF RISK SCORE
                    </span>
                    <div className="mt-1 font-display text-4xl font-bold text-axiom-red">
                      {Math.round(selectedShopper.risk_score * 100)}%
                    </div>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-axiom-muted">
                      MODEL CONFIDENCE
                    </span>
                    <div className="mt-1 font-display text-4xl font-bold text-axiom-ink">
                      {Math.round(selectedShopper.confidence * 100)}%
                    </div>
                  </div>
                </div>

                {/* Predicted Next Action */}
                <div className="mt-4 rounded-xl border border-axiom-blue/30 bg-axiom-bluesoft/50 p-4">
                  <span className="font-mono text-[10px] uppercase text-axiom-blue font-semibold">
                    PREDICTED NEXT ACTION & RECOMMENDED INTERVENTION
                  </span>
                  <div className="mt-1 font-display text-sm font-bold text-axiom-ink">
                    {selectedShopper.predicted_next_action}
                  </div>
                </div>

                {/* Signal Breakdown Bars */}
                <div className="mt-6">
                  <div className="flex items-center justify-between font-mono text-[11px] uppercase text-axiom-muted mb-3">
                    <span>BEHAVIORAL SIGNAL BREAKDOWN</span>
                    <span>WEIGHT CONTRIBUTION</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(selectedShopper.signal_breakdown).map(([sig, val]) => (
                      <div
                        key={sig}
                        className="rounded-xl border border-axiom-softline bg-axiom-bg/60 p-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-axiom-ink">{sig}</span>
                          <span className="font-mono font-bold text-axiom-blue">
                            +{val}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-axiom-surface overflow-hidden">
                          <div
                            className="h-full rounded-full bg-axiom-blue"
                            style={{ width: `${Math.min(100, (val / 30) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chronological Behavioral Timeline */}
              <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-6">
                <div className="flex items-center justify-between border-b border-axiom-softline pb-3 mb-5">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
                      BEHAVIORAL TIMELINE
                    </span>
                    <h3 className="font-display text-base font-bold text-axiom-ink">
                      Chronological Session Event Stream ({selectedShopper.display_id})
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-axiom-muted">
                    {shopperEvents.length} recorded events
                  </span>
                </div>

                <div className="relative pl-6 border-l-2 border-axiom-line space-y-4">
                  {(shopperEvents.length > 0 ? shopperEvents : snapshot.events.slice(0, 6)).map(
                    (evt) => (
                      <div key={evt.id} className="relative">
                        <span
                          className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            evt.is_axiom_signal ? "bg-axiom-blue" : "bg-axiom-ink"
                          }`}
                        />
                        <div
                          className={`rounded-xl border p-3.5 ${
                            evt.is_axiom_signal
                              ? "border-axiom-blue bg-axiom-bluesoft/50"
                              : "border-axiom-softline bg-axiom-bg/40"
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-xs">
                            <span className="font-bold text-axiom-ink">{evt.label}</span>
                            <span className="text-axiom-muted">
                              {formatClockTime(evt.timestamp)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-axiom-muted">{evt.detail}</div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Actions Already Triggered & Recovery Opportunities for this Shopper */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5">
                  <span className="font-mono text-[10px] uppercase text-axiom-blue font-semibold">
                    RECOVERY OPPORTUNITIES
                  </span>
                  <h4 className="font-display text-sm font-bold text-axiom-ink mt-1 mb-3">
                    Matched Opportunities for {selectedShopper.display_id}
                  </h4>
                  <div className="space-y-2.5">
                    {(shopperOpportunities.length > 0
                      ? shopperOpportunities
                      : snapshot.opportunities.slice(0, 2)
                    ).map((opp) => (
                      <div
                        key={opp.id}
                        className="rounded-xl border border-axiom-softline bg-axiom-bg/60 p-3 text-xs"
                      >
                        <div className="font-bold text-axiom-ink">
                          {opp.title} · {opp.product_name}
                        </div>
                        <div className="text-axiom-muted mt-0.5">{opp.trigger}</div>
                        <button
                          type="button"
                          onClick={() => handleActivate(opp)}
                          className="mt-2 rounded bg-axiom-ink px-2.5 py-1 font-mono text-[10px] font-semibold text-white hover:bg-axiom-blue"
                        >
                          [ ACTIVATE RECOVERY ]
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5">
                  <span className="font-mono text-[10px] uppercase text-axiom-green font-semibold">
                    AUTONOMOUS ACTIONS EXECUTED
                  </span>
                  <h4 className="font-display text-sm font-bold text-axiom-ink mt-1 mb-3">
                    Actions Delivered to {selectedShopper.display_id}
                  </h4>
                  <div className="space-y-2.5">
                    {(shopperActions.length > 0
                      ? shopperActions
                      : snapshot.actions.slice(0, 2)
                    ).map((act) => (
                      <div
                        key={act.id}
                        className="rounded-xl border border-axiom-softline bg-axiom-bg/60 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-axiom-ink">{act.action_label}</strong>
                          <span className="rounded bg-axiom-greensoft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-axiom-green uppercase">
                            {act.status}
                          </span>
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-axiom-blue">
                          &ldquo;{act.message}&rdquo;
                        </div>
                        <div className="mt-1 text-[11px] text-axiom-muted">
                          Result: {act.result}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 04: PRODUCTS INTELLIGENCE
        ============================================================ */}
        {activeSection === "products" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {snapshot.products.map((prod) => {
                const hasDrop = prod.price < prod.original_price;
                const dropPct = hasDrop
                  ? Math.abs(
                      Math.round(
                        ((prod.price - prod.original_price) / prod.original_price) * 1000
                      ) / 10
                    )
                  : 0;

                return (
                  <div
                    key={prod.id}
                    className="rounded-2xl border border-axiom-line bg-axiom-paper p-6 flex flex-col justify-between shadow-subtle"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
                          {prod.category} · {prod.brand}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                            prod.recovery_opportunity_level === "HIGH"
                              ? "bg-axiom-bluesoft text-axiom-blue"
                              : "bg-axiom-surface text-axiom-ink"
                          }`}
                        >
                          OPPORTUNITY: {prod.recovery_opportunity_level}
                        </span>
                      </div>

                      <h3 className="mt-2 font-display text-xl font-bold text-axiom-ink">
                        {prod.name}
                      </h3>

                      <div className="mt-2 flex items-baseline gap-3">
                        <span className="font-display text-3xl font-bold text-axiom-ink">
                          {formatINR(prod.price)}
                        </span>
                        {hasDrop && (
                          <>
                            <span className="font-mono text-sm line-through text-axiom-muted">
                              {formatINR(prod.original_price)}
                            </span>
                            <span className="rounded bg-axiom-greensoft px-2 py-0.5 font-mono text-xs font-semibold text-axiom-green">
                              PRICE DROP: {dropPct}%
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-b border-axiom-softline py-4 font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-axiom-muted block">
                            HIGH INTENT
                          </span>
                          <strong className="text-axiom-blue text-sm">
                            {prod.high_intent_shoppers || 23} shoppers
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-axiom-muted block">
                            WATCHLIST
                          </span>
                          <strong className="text-axiom-ink text-sm">
                            {prod.wishlist_count}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-axiom-muted block">
                            ACTIVE CARTS
                          </span>
                          <strong className="text-axiom-ink text-sm">
                            {prod.cart_adds}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-axiom-muted block">
                            INVENTORY
                          </span>
                          <strong
                            className={`text-sm ${
                              prod.inventory <= 15 ? "text-axiom-red" : "text-axiom-ink"
                            }`}
                          >
                            {prod.inventory} units
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-axiom-muted">
                        Conv. Rate: {prod.conversion_rate}%
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await onSimulateMarketEvent(prod.id, "price_drop");
                          showToast(
                            `Simulated price drop on ${prod.name} · Opportunity & actions updated`
                          );
                        }}
                        className="rounded-lg border border-axiom-line bg-white px-3 py-1.5 font-mono text-[11px] font-semibold text-axiom-ink hover:bg-axiom-ink hover:text-white transition-colors"
                      >
                        Simulate Price Drop
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 05: INTENT ENGINE
        ============================================================ */}
        {activeSection === "intent" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Interactive What-If Signal Simulator */}
            <div className="lg:col-span-6 rounded-2xl border border-axiom-line bg-axiom-paper p-6">
              <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-blue font-semibold">
                INTERACTIVE INTENT SCORER
              </span>
              <h2 className="mt-1 font-display text-xl font-bold text-axiom-ink">
                Behavioral Feature → Intent Model Sandbox
              </h2>
              <p className="mt-1 text-xs text-axiom-muted">
                Adjust granular shopper micro-behaviors below to inspect how Axiom computes{" "}
                <code className="font-mono">purchaseIntentScore</code>,{" "}
                <code className="font-mono">dropOffRiskScore</code>, and{" "}
                <code className="font-mono">signalBreakdown</code>.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>Repeated Product Views</span>
                    <span className="font-mono text-axiom-blue">
                      {whatIfSignals.repeatedViews}× views
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    value={whatIfSignals.repeatedViews}
                    onChange={(e) =>
                      setWhatIfSignals((s) => ({
                        ...s,
                        repeatedViews: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-axiom-blue"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>Price Check Frequency</span>
                    <span className="font-mono text-axiom-blue">
                      {whatIfSignals.priceChecks}× checks
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    value={whatIfSignals.priceChecks}
                    onChange={(e) =>
                      setWhatIfSignals((s) => ({
                        ...s,
                        priceChecks: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-axiom-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { key: "cartAdded", label: "Added to Cart (+27)" },
                    { key: "returnedSession", label: "Returned Session (+14)" },
                    { key: "checkoutHesitation", label: "Checkout Hesitation (+11)" },
                    { key: "watchlistSaved", label: "Watchlist Activity (+9)" },
                  ].map((item) => {
                    const active =
                      whatIfSignals[item.key as keyof typeof whatIfSignals];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setWhatIfSignals((s) => ({
                            ...s,
                            [item.key]: !s[item.key as keyof typeof whatIfSignals],
                          }))
                        }
                        className={`rounded-xl border p-3 text-left text-xs font-medium transition-colors ${
                          active
                            ? "border-axiom-blue bg-axiom-bluesoft/60 text-axiom-ink"
                            : "border-axiom-line bg-axiom-bg text-axiom-muted"
                        }`}
                      >
                        <div className="font-mono text-[10px] uppercase">
                          {active ? "● SIGNAL ACTIVE" : "○ INACTIVE"}
                        </div>
                        <div className="mt-1 font-bold">{item.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Computed Output Card */}
            <div className="lg:col-span-6 rounded-2xl border border-axiom-line bg-axiom-paper p-6">
              <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
                MODEL OUTPUT CONTRACT
              </span>
              <div className="mt-4 grid grid-cols-3 gap-4 border-b border-axiom-softline pb-5">
                <div>
                  <span className="font-mono text-[10px] text-axiom-muted block">
                    PURCHASE INTENT
                  </span>
                  <strong className="font-display text-4xl text-axiom-blue">
                    {whatIfIntentPct}%
                  </strong>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-axiom-muted block">
                    DROP-OFF RISK
                  </span>
                  <strong className="font-display text-4xl text-axiom-red">
                    {whatIfRiskPct}%
                  </strong>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-axiom-muted block">
                    CONFIDENCE
                  </span>
                  <strong className="font-display text-4xl text-axiom-ink">94%</strong>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                <div className="font-mono text-xs uppercase text-axiom-muted">
                  SIGNALS CONTRIBUTION
                </div>
                {Object.entries(whatIfBreakdown).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-lg bg-axiom-bg px-3 py-2 text-xs"
                  >
                    <span className="text-axiom-ink font-medium">{k}</span>
                    <span className="font-mono font-bold text-axiom-blue">
                      +{Math.round(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 06: OPPORTUNITIES
        ============================================================ */}
        {activeSection === "opportunities" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {snapshot.opportunities.map((opp) => (
              <div
                key={opp.id}
                className="rounded-2xl border border-axiom-line bg-axiom-paper p-6 flex flex-col justify-between shadow-subtle"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-axiom-bluesoft px-2.5 py-1 font-mono text-xs font-bold text-axiom-blue">
                      {opp.title}
                    </span>
                    <span className="font-mono text-xs text-axiom-muted">
                      URGENCY: <strong className="text-axiom-red">{opp.urgency}</strong>
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-2xl font-bold text-axiom-ink">
                    {opp.product_name}
                  </h3>

                  <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-axiom-softline bg-axiom-bg p-3.5 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-axiom-muted block">SHOPPERS</span>
                      <strong className="text-axiom-ink text-sm">
                        {opp.shopper_count} shoppers
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-axiom-muted block">AVG INTENT</span>
                      <strong className="text-axiom-blue text-sm">
                        {Math.round(opp.avg_intent * 100)}% intent
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-axiom-muted block">
                        {opp.opportunity_type === "inventory_pressure"
                          ? "INVENTORY"
                          : "PRICE SHIFT"}
                      </span>
                      <strong className="text-axiom-green text-sm">
                        {opp.opportunity_type === "inventory_pressure"
                          ? `${opp.inventory_remaining || 12} remaining`
                          : opp.price_reduction
                          ? `₹${opp.price_reduction} reduction`
                          : formatINR(opp.product_price)}
                      </strong>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-axiom-muted leading-relaxed">
                    {opp.description}
                  </p>

                  <div className="mt-4 rounded-xl border border-axiom-softline bg-white p-3.5">
                    <span className="font-mono text-[10px] uppercase text-axiom-muted block">
                      RECOMMENDED ACTION
                    </span>
                    <strong className="font-display text-sm text-axiom-ink">
                      {opp.recommended_action}
                    </strong>
                    <span className="block font-mono text-[11px] text-axiom-blue mt-0.5">
                      Channel: {opp.action_channel}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-axiom-softline flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-axiom-muted block">
                      REVENUE OPPORTUNITY
                    </span>
                    <strong className="font-display text-xl text-axiom-green">
                      {formatINR(opp.revenue_potential)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    disabled={activatingId === opp.id}
                    onClick={() => handleActivate(opp)}
                    className={`rounded-xl px-5 py-2.5 font-mono text-xs font-bold transition-all ${
                      opp.status === "activated"
                        ? "bg-axiom-greensoft text-axiom-green"
                        : "bg-axiom-ink text-white hover:bg-axiom-blue shadow-subtle"
                    }`}
                  >
                    {opp.status === "activated"
                      ? "✓ RECOVERY ACTIVATED"
                      : activatingId === opp.id
                      ? "ACTIVATING..."
                      : "[ ACTIVATE ]"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================
            VIEW 07: MARKET MONITOR
        ============================================================ */}
        {activeSection === "market" && (
          <div className="space-y-6">
            {/* Simulate Market Signal Control Bar */}
            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-blue font-semibold">
                  LIVE MARKET RADAR (`POST /api/market-events/simulate`)
                </span>
                <h2 className="font-display text-base font-bold text-axiom-ink">
                  Inject Price Movement or Inventory Pressure Signal
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={simProductId}
                  onChange={(e) => setSimProductId(e.target.value)}
                  className="rounded-xl border border-axiom-line bg-white px-3 py-2 font-mono text-xs"
                >
                  {snapshot.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatINR(p.price)} · {p.inventory} left)
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={async () => {
                    await onSimulateMarketEvent(simProductId, "price_drop");
                    showToast("Price drop detected → Opportunity & recovery actions generated");
                  }}
                  className="rounded-xl bg-axiom-ink px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-axiom-blue transition-colors"
                >
                  Trigger Price Drop (-11%)
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await onSimulateMarketEvent(simProductId, "low_stock");
                    showToast("Inventory pressure signal injected into Market Monitor");
                  }}
                  className="rounded-xl border border-axiom-line bg-white px-4 py-2 font-mono text-xs font-semibold text-axiom-ink hover:border-axiom-ink"
                >
                  Trigger Low Stock Alert
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {snapshot.market_events.map((me) => (
                <div
                  key={me.id}
                  className="rounded-2xl border border-axiom-line bg-axiom-paper p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-axiom-bluesoft px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-axiom-blue">
                      {me.event_type.replace("_", " ")} DETECTED
                    </span>
                    <span className="font-mono text-xs text-axiom-muted">
                      {formatClockTime(me.timestamp)}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-2xl font-bold text-axiom-ink">
                    {me.product_name}
                  </h3>

                  <div className="mt-3 flex items-baseline gap-4">
                    {me.old_value !== undefined && (
                      <span className="font-mono text-lg line-through text-axiom-muted">
                        {me.event_type === "low_stock"
                          ? `${me.old_value} units`
                          : formatINR(me.old_value)}
                      </span>
                    )}
                    <span className="font-mono text-lg text-axiom-muted">↓</span>
                    {me.new_value !== undefined && (
                      <span className="font-display text-3xl font-bold text-axiom-blue">
                        {me.event_type === "low_stock"
                          ? `${me.new_value} remaining`
                          : formatINR(me.new_value)}
                      </span>
                    )}
                    {me.change_pct !== undefined && (
                      <span className="rounded bg-axiom-greensoft px-2 py-0.5 font-mono text-xs font-semibold text-axiom-green">
                        {me.change_pct}%
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-axiom-muted">{me.summary}</p>

                  <div className="mt-4 pt-3 border-t border-axiom-softline flex items-center justify-between font-mono text-xs">
                    <span>
                      Shopper intent:{" "}
                      <strong className="text-axiom-blue">
                        {Math.round((me.avg_shopper_intent || 0.91) * 100)}%
                      </strong>
                    </span>
                    <span>
                      Drop-off risk:{" "}
                      <strong className="text-axiom-red">
                        {Math.round((me.avg_drop_off_risk || 0.78) * 100)}%
                      </strong>
                    </span>
                    <span>
                      Affected: <strong>{me.affected_shoppers || 23} shoppers</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 08: AUTONOMOUS ACTIONS LEDGER
        ============================================================ */}
        {activeSection === "actions" && (
          <div className="space-y-4">
            {snapshot.actions.map((act) => (
              <div
                key={act.id}
                className="rounded-2xl border border-axiom-line bg-axiom-paper p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded bg-axiom-ink px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                      ACTION EXECUTED
                    </span>
                    <span className="font-mono text-xs font-bold text-axiom-blue">
                      {act.action_label}
                    </span>
                    <span className="font-mono text-xs text-axiom-muted">
                      {formatClockTime(act.created_at)}
                    </span>
                  </div>
                  <div className="font-display text-lg font-bold text-axiom-ink">
                    Target: Shopper {act.shopper_display_id} · {act.product_name} (
                    {formatINR(act.product_price)})
                  </div>
                  <div className="text-xs text-axiom-muted">
                    Trigger: <strong className="text-axiom-ink">{act.trigger}</strong> ·
                    Intent: <strong className="text-axiom-blue">{Math.round(act.intent_score * 100)}%</strong> ·
                    Payload: <code className="font-mono text-axiom-ink">{act.message}</code>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end lg:self-center shrink-0">
                  <div className="text-right">
                    <span className="font-mono text-[10px] uppercase text-axiom-muted block">
                      RESULT
                    </span>
                    <strong className="text-xs text-axiom-ink">{act.result}</strong>
                  </div>
                  <span className="rounded-lg bg-axiom-greensoft px-3 py-1.5 font-mono text-xs font-bold text-axiom-green uppercase">
                    {act.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================
            VIEW 09: CAMPAIGNS
        ============================================================ */}
        {activeSection === "campaigns" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {snapshot.campaigns.map((camp) => (
              <div
                key={camp.id}
                className="rounded-2xl border border-axiom-line bg-axiom-paper p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-blue font-semibold">
                      AUTONOMOUS PLAYBOOK
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await onToggleCampaign(camp.id);
                        showToast(`Toggled status for campaign: ${camp.name}`);
                      }}
                      className={`rounded-full px-3 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        camp.status === "active"
                          ? "bg-axiom-greensoft text-axiom-green"
                          : "bg-axiom-surface text-axiom-muted"
                      }`}
                    >
                      ● {camp.status}
                    </button>
                  </div>

                  <h3 className="mt-2 font-display text-xl font-bold text-axiom-ink">
                    {camp.name}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-axiom-muted">
                    Trigger: {camp.trigger_condition}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-b border-axiom-softline py-4 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-axiom-muted block">ENROLLED</span>
                      <strong className="text-sm text-axiom-ink">
                        {camp.enrolled_shoppers}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-axiom-muted block">CONVERSION</span>
                      <strong className="text-sm text-axiom-blue">
                        {camp.conversion_rate}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-axiom-muted block">RECOVERED</span>
                      <strong className="text-sm text-axiom-green">
                        {formatINR(camp.recovered_revenue)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-axiom-muted">
                  <span>Channel: {camp.action_type}</span>
                  <span>{camp.actions_sent} actions dispatched</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================
            VIEW 10: WEBHOOKS
        ============================================================ */}
        {activeSection === "webhooks" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-blue font-semibold">
                  EVENT STREAM OUTBOX
                </span>
                <h2 className="font-display text-base font-bold text-axiom-ink">
                  Webhook Endpoint: <code>POST /webhooks/recovery</code>
                </h2>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await onSendTestWebhook();
                  showToast("Dispatched signed test webhook payload (200 OK)");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-axiom-ink px-4 py-2 text-xs font-semibold text-white hover:bg-axiom-blue transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                Dispatch Test Webhook
              </button>
            </div>

            <div className="space-y-4">
              {snapshot.webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="rounded-2xl border border-axiom-line bg-axiom-paper p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-axiom-softline pb-3">
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="rounded bg-axiom-greensoft px-2 py-0.5 font-bold text-axiom-green">
                        {wh.status_code} OK
                      </span>
                      <strong className="text-axiom-ink">{wh.endpoint}</strong>
                      <span className="text-axiom-blue">{wh.event_name}</span>
                    </div>
                    <div className="font-mono text-xs text-axiom-muted">
                      {wh.latency_ms}ms · {formatClockTime(wh.timestamp)}
                    </div>
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-axiom-bg p-3.5 font-mono text-[11px] text-axiom-ink">
                    {JSON.stringify(wh.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 11: ANALYTICS
        ============================================================ */}
        {activeSection === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-axiom-line bg-axiom-paper p-6">
              <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-blue font-semibold">
                CLOSED-LOOP CONVERSION LIFT
              </span>
              <h2 className="mt-1 font-display text-xl font-bold text-axiom-ink">
                Recovery Funnel Performance by Signal Trigger
              </h2>
              <div className="mt-6 space-y-4">
                {[
                  {
                    label: "High Intent (≥85%) + Price Drop Nudge",
                    conv: 44.2,
                    rev: "₹1,64,820",
                  },
                  {
                    label: "Hesitation Loop Interception (In-Session)",
                    conv: 39.3,
                    rev: "₹1,12,450",
                  },
                  {
                    label: "Low-Inventory Watchlist Urgency Signal",
                    conv: 36.4,
                    rev: "₹1,59,936",
                  },
                  {
                    label: "Baseline Unassisted Abandoned Carts",
                    conv: 8.4,
                    rev: "₹24,100",
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-axiom-ink">{item.label}</span>
                      <span className="font-mono text-axiom-blue font-bold">
                        {item.conv}% conv · {item.rev}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-axiom-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-axiom-blue"
                        style={{ width: `${item.conv * 2}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-axiom-line bg-axiom-paper p-6">
              <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
                CATEGORY INTENT DENSITY
              </span>
              <h2 className="mt-1 font-display text-xl font-bold text-axiom-ink">
                Recoverable Revenue by Category
              </h2>
              <div className="mt-5 space-y-3">
                {[
                  { cat: "Denim & Apparel", density: "89%", rev: "₹1,24,500" },
                  { cat: "Electronics & Audio", density: "86%", rev: "₹2,18,900" },
                  { cat: "Home & Ceramic Objects", density: "92%", rev: "₹84,200" },
                  { cat: "Skincare & Cosmetics", density: "88%", rev: "₹96,400" },
                  { cat: "Sneakers & Footwear", density: "84%", rev: "₹1,49,400" },
                ].map((c) => (
                  <div
                    key={c.cat}
                    className="flex items-center justify-between rounded-xl border border-axiom-softline bg-axiom-bg/60 px-4 py-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-axiom-ink">{c.cat}</div>
                      <div className="font-mono text-[11px] text-axiom-muted">
                        Intent Density: {c.density}
                      </div>
                    </div>
                    <strong className="font-mono text-sm text-axiom-green">
                      {c.rev}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 12: SETTINGS
        ============================================================ */}
        {activeSection === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-6 space-y-5">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-blue font-semibold">
                  AUTONOMOUS DECISION THRESHOLDS
                </span>
                <h2 className="mt-1 font-display text-xl font-bold text-axiom-ink">
                  Intent & Recovery Policy Configuration
                </h2>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Minimum Purchase Intent Score for Autonomous Action</span>
                  <span className="font-mono font-bold text-axiom-blue">
                    {intentThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={intentThreshold}
                  onChange={(e) => setIntentThreshold(Number(e.target.value))}
                  className="w-full accent-axiom-blue"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Drop-Off Risk Hesitation Threshold</span>
                  <span className="font-mono font-bold text-axiom-red">
                    {riskThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={35}
                  max={90}
                  value={riskThreshold}
                  onChange={(e) => setRiskThreshold(Number(e.target.value))}
                  className="w-full accent-axiom-blue"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-axiom-softline bg-axiom-bg p-4">
                <div>
                  <div className="font-display text-sm font-bold text-axiom-ink">
                    Autonomous Execution Mode
                  </div>
                  <div className="text-xs text-axiom-muted">
                    Automatically dispatch in-app nudges and webhooks when opportunity
                    confidence ≥ 90%
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAutonomousMode((m) => !m);
                    showToast("Updated Autonomous Execution policy");
                  }}
                  className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold ${
                    autonomousMode
                      ? "bg-axiom-green text-white"
                      : "bg-axiom-surface text-axiom-muted"
                  }`}
                >
                  {autonomousMode ? "ENABLED" : "MANUAL"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-6 space-y-4">
              <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
                SYSTEM ADAPTERS & INFRASTRUCTURE
              </span>
              <h2 className="font-display text-xl font-bold text-axiom-ink">
                Connected Production & Simulation Adapters
              </h2>
              <div className="space-y-2.5 font-mono text-xs">
                {[
                  { name: "FastAPI Event Ingestion Engine", status: "CONNECTED · /api/events/ingest" },
                  { name: "SQLite Persistent Event Store", status: "ACTIVE · backend/axiom_engine.db" },
                  { name: "Real-Time Stream (SSE + WebSocket)", status: "STREAMING · /api/stream & /ws" },
                  { name: "Intent Scoring Model Interface", status: "ACTIVE · Heuristic + ML-Ready" },
                  { name: "Webhook Recovery Outbox", status: "READY · POST /webhooks/recovery" },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between rounded-xl border border-axiom-softline bg-axiom-bg/60 px-3.5 py-2.5"
                  >
                    <span className="text-axiom-ink font-medium">{row.name}</span>
                    <span className="text-axiom-green font-semibold">{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
