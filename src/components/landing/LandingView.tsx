"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Activity,
  Sparkles,
  TrendingDown,
  Zap,
  Webhook,
  CheckCircle2,
  Eye,
  ShoppingCart,
  Search,
  RefreshCw,
  AlertTriangle,
  Layers,
  ShieldCheck,
} from "lucide-react";
import CommerceNetwork3D from "@/components/three/CommerceNetwork3D";
import { AxiomSnapshot, WorkspaceSection } from "@/types/axiom";
import { formatINR, formatCompactINR } from "@/lib/api";

interface LandingViewProps {
  snapshot: AxiomSnapshot;
  onEnterWorkspace: (section?: WorkspaceSection, shopperId?: string) => void;
  onActivateOpportunity: (oppId: string) => void;
}

const SESSION_STORY_STEPS = [
  {
    time: "22:41:08",
    type: "SEARCH",
    title: '"black jeans"',
    detail: "Shopper #4821 enters via mobile Safari and queries high-intent product term.",
    intentDelta: "+8",
    intentTotal: 24,
    accent: "neutral",
  },
  {
    time: "22:41:31",
    type: "PRODUCT VIEW",
    title: "Black Denim / ₹4,398",
    detail: "4th revisit to product page across 2 sessions. Dwell time 3m 42s; sizing chart inspected.",
    intentDelta: "+18",
    intentTotal: 42,
    accent: "blue",
  },
  {
    time: "22:42:04",
    type: "ADDED TO CART",
    title: "Size 32 · Slim Tapered",
    detail: "Item committed to active shopping bag (₹4,398). Strong purchase progression signal.",
    intentDelta: "+27",
    intentTotal: 69,
    accent: "blue",
  },
  {
    time: "22:43:19",
    type: "PRICE CHECK",
    title: "3× Price & Coupon Inspection",
    detail: "Shopper toggles shipping estimator and checks price 3 times without advancing payment.",
    intentDelta: "+21",
    intentTotal: 81,
    accent: "amber",
  },
  {
    time: "22:44:02",
    type: "LEFT CART",
    title: "Checkout Stalled",
    detail: "Shopper exits checkout drawer with ₹4,398 in bag. Drop-off risk spikes to 78%.",
    intentDelta: "-4",
    intentTotal: 77,
    accent: "red",
  },
  {
    time: "22:45:17",
    type: "RETURNED",
    title: "Returned to Black Denim",
    detail: "Shopper returns 75 seconds later and re-opens Black Denim product page.",
    intentDelta: "+14",
    intentTotal: 91,
    accent: "blue",
  },
  {
    time: "22:45:19",
    type: "AXIOM ENGINE",
    title: "HESITATION LOOP DETECTED",
    detail: "Purchase Intent: 91% · Drop-Off Risk: 78% · Price Drop (₹4,398 → ₹3,899) matched → Nudge Delivered.",
    intentDelta: "ACTION",
    intentTotal: 91,
    accent: "green",
  },
];

const MICRO_BEHAVIORS = [
  { label: "Real-time search queries", code: "SIG_01", weight: "+8 pts", category: "Discovery" },
  { label: "Repeated searches", code: "SIG_02", weight: "+12 pts", category: "Discovery" },
  { label: "Product views & dwell time", code: "SIG_03", weight: "+10 pts", category: "Engagement" },
  { label: "Repeated product revisits (4×)", code: "SIG_04", weight: "+18 pts", category: "Affinity" },
  { label: "Product watchlists & saves", code: "SIG_05", weight: "+14 pts", category: "Affinity" },
  { label: "Wishlist activity & restock checks", code: "SIG_06", weight: "+12 pts", category: "Affinity" },
  { label: "Adding / removing items from cart", code: "SIG_07", weight: "+27 pts", category: "Commitment" },
  { label: "Cart abandonment & stall timing", code: "SIG_08", weight: "Risk +25%", category: "Friction" },
  { label: "Repeated price checking (3×)", code: "SIG_09", weight: "+21 pts", category: "Sensitivity" },
  { label: "Checkout hesitation loops", code: "SIG_10", weight: "+11 pts", category: "Friction" },
  { label: "Returning to the same product", code: "SIG_11", weight: "+14 pts", category: "Persistence" },
  { label: "Comparing products & specs", code: "SIG_12", weight: "+15 pts", category: "Evaluation" },
  { label: "Inventory & stock awareness", code: "SIG_13", weight: "+16 pts", category: "Urgency" },
  { label: "Price sensitivity elasticity", code: "SIG_14", weight: "Model Signal", category: "Economics" },
  { label: "Session frequency & recency", code: "SIG_15", weight: "+14 pts", category: "Velocity" },
  { label: "Historical conversion behavior", code: "SIG_16", weight: "Prior Weight", category: "History" },
];

export default function LandingView({
  snapshot,
  onEnterWorkspace,
  onActivateOpportunity,
}: LandingViewProps) {
  const [activeStoryIdx, setActiveStoryIdx] = useState<number>(6);
  const [storyAutoPlay, setStoryAutoPlay] = useState<boolean>(true);

  useEffect(() => {
    if (!storyAutoPlay) return;
    const timer = setInterval(() => {
      setActiveStoryIdx((prev) => (prev + 1) % SESSION_STORY_STEPS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [storyAutoPlay]);

  const latestEvent = snapshot.events[0];

  return (
    <div className="min-h-screen bg-axiom-bg text-axiom-ink selection:bg-axiom-blue selection:text-white">
      {/* Top Floating Editorial Navigation */}
      <header className="fixed top-4 left-0 right-0 z-50 mx-auto max-w-[1280px] px-4 sm:px-6">
        <nav className="flex items-center justify-between rounded-2xl border border-axiom-line bg-axiom-paper/85 px-4 py-3 backdrop-blur-xl shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="flex items-end gap-0.5 h-5 w-5">
              <span className="w-1.5 h-2.5 bg-axiom-ink rounded-[1px]" />
              <span className="w-1.5 h-3.5 bg-axiom-ink rounded-[1px]" />
              <span className="w-1.5 h-5 bg-axiom-blue rounded-[1px]" />
            </div>
            <span className="font-display text-base font-bold tracking-tight text-axiom-ink">
              AXIOM
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-axiom-line bg-white/70 px-2.5 py-0.5 font-mono text-[10px] text-axiom-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-axiom-green animate-pulse" />
              ENGINE v2.0 LIVE
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-xs font-medium text-axiom-muted">
            <a href="#section-01" className="hover:text-axiom-ink transition-colors">
              01 · Live Telemetry
            </a>
            <a href="#section-02" className="hover:text-axiom-ink transition-colors">
              02 · Micro-Behaviors
            </a>
            <a href="#section-03" className="hover:text-axiom-ink transition-colors">
              03 · Intent Engine
            </a>
            <a href="#section-04" className="hover:text-axiom-ink transition-colors">
              04 · Market Radar
            </a>
            <a href="#section-05" className="hover:text-axiom-ink transition-colors">
              05 · Opportunities
            </a>
            <a href="#section-06" className="hover:text-axiom-ink transition-colors">
              06 · Autonomous Action
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onEnterWorkspace("signals")}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-axiom-line bg-white px-3 py-2 font-mono text-xs text-axiom-ink hover:border-axiom-ink transition-colors"
            >
              <Activity className="h-3.5 w-3.5 text-axiom-blue" />
              Live Stream ({snapshot.stats.live_shoppers})
            </button>
            <button
              type="button"
              onClick={() => onEnterWorkspace("overview")}
              className="inline-flex items-center gap-2 rounded-xl bg-axiom-ink px-4 py-2 text-xs font-semibold text-white hover:bg-axiom-blue transition-colors"
            >
              See Axiom in Action
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </nav>
      </header>

      {/* ============================================================
          HERO — EDITORIAL PRODUCT PRESENTATION + 3D COMMERCE NETWORK
      ============================================================ */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 px-4 sm:px-6 max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Editorial Manifesto */}
          <div className="lg:col-span-5 pt-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-axiom-line bg-axiom-paper px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-axiom-muted">
              <span className="h-2 w-2 rounded-full bg-axiom-green animate-pulse" />
              AUTONOMOUS COMMERCE INTELLIGENCE
            </div>

            <h1 className="mt-6 font-display text-5xl sm:text-6xl xl:text-[68px] font-bold tracking-[-0.04em] leading-[0.94] text-axiom-ink">
              YOUR STORE IS TALKING.
              <span className="block mt-2 text-axiom-blue">AXIOM LISTENS.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg leading-relaxed text-axiom-muted max-w-xl">
              Axiom watches the micro-behaviors behind every shopper, understands purchase
              intent, detects recoverable revenue, and acts automatically.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => onEnterWorkspace("overview")}
                className="inline-flex items-center gap-2.5 rounded-xl bg-axiom-ink px-6 py-3.5 text-sm font-semibold text-white shadow-floating hover:bg-axiom-blue transition-all"
              >
                SEE AXIOM IN ACTION
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#section-01"
                className="inline-flex items-center gap-2 rounded-xl border border-axiom-line bg-axiom-paper px-5 py-3.5 text-sm font-medium text-axiom-ink hover:border-axiom-ink transition-colors"
              >
                EXPLORE THE ENGINE
              </a>
            </div>

            {/* Central System Loop Pill Chain */}
            <div className="mt-10 rounded-2xl border border-axiom-line bg-axiom-paper p-4 shadow-subtle">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
                  AUTONOMOUS CLOSED-LOOP ARCHITECTURE
                </span>
                <span className="font-mono text-[10px] text-axiom-green font-semibold">
                  ACTIVE · {snapshot.stats.total_events.toLocaleString()} EVENTS
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                {[
                  "SHOPPER BEHAVIOR",
                  "EVENT TELEMETRY",
                  "PATTERN",
                  "INTENT (91%)",
                  "RISK (78%)",
                  "MARKET SIGNAL",
                  "OPPORTUNITY",
                  "AUTONOMOUS ACTION",
                  "REVENUE RECOVERY",
                ].map((step, i, arr) => (
                  <React.Fragment key={step}>
                    <span
                      className={`rounded-md px-2 py-0.5 ${
                        step.includes("INTENT") || step.includes("ACTION")
                          ? "bg-axiom-bluesoft text-axiom-blue font-semibold"
                          : step.includes("REVENUE")
                          ? "bg-axiom-greensoft text-axiom-green font-semibold"
                          : "bg-axiom-surface text-axiom-ink"
                      }`}
                    >
                      {step}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="text-axiom-muted">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: 3D Commerce Signal Network */}
          <div className="lg:col-span-7">
            <CommerceNetwork3D
              activeEventLabel={latestEvent?.label || "HESITATION LOOP DETECTED"}
              intentScorePct={91}
              onSelectNode={(node) => {
                if (node.id === "shopper") onEnterWorkspace("shoppers", "shopper_4821");
                if (node.id === "market") onEnterWorkspace("market");
                if (node.id === "recovery") onEnterWorkspace("actions");
              }}
            />
          </div>
        </div>

        {/* Live Telemetry Bar Underneath Hero */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-3 rounded-2xl border border-axiom-line bg-axiom-paper p-4 shadow-subtle">
          <div className="border-r border-axiom-softline pr-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
              LIVE SHOPPERS
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-axiom-ink">
              {snapshot.stats.live_shoppers}
              <span className="ml-2 font-mono text-xs font-normal text-axiom-green">
                ● {snapshot.stats.high_intent_shoppers} high-intent
              </span>
            </div>
          </div>
          <div className="md:border-r border-axiom-softline pr-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
              HESITATION LOOPS
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-axiom-red">
              {snapshot.stats.hesitation_loops_active}
              <span className="ml-2 font-mono text-xs font-normal text-axiom-muted">
                active sessions
              </span>
            </div>
          </div>
          <div className="border-r border-axiom-softline pr-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
              REVENUE AT RISK
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-axiom-ink">
              {formatCompactINR(snapshot.stats.revenue_at_risk)}
            </div>
          </div>
          <div className="md:border-r border-axiom-softline pr-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
              ACTIVE OPPORTUNITIES
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-axiom-blue">
              {snapshot.stats.recovery_opportunities}
              <span className="ml-2 font-mono text-xs font-normal text-axiom-muted">
                ready to act
              </span>
            </div>
          </div>
          <div className="col-span-2 md:col-span-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
              RECOVERED REVENUE
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-axiom-green">
              {formatINR(snapshot.stats.recovered_revenue)}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 01 — THE STORE IS TALKING (LIVE SESSION EVOLUTION)
      ============================================================ */}
      <section
        id="section-01"
        className="py-20 px-4 sm:px-6 max-w-[1280px] mx-auto border-t border-axiom-line"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <span className="font-mono text-xs uppercase tracking-widest text-axiom-blue font-semibold">
              SECTION 01 · LIVE SESSION TELEMETRY
            </span>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-axiom-ink leading-[1.04]">
              THE STORE IS TALKING.
            </h2>
            <p className="mt-4 text-base text-axiom-muted leading-relaxed">
              Every search, revisit, price check, and cart pause is a live behavioral signal
              — not a static database row to inspect next week. Watch how Shopper{" "}
              <strong className="text-axiom-ink">#4821</strong> evolves over 4 minutes and 11
              seconds.
            </p>

            <div className="mt-6 rounded-2xl border border-axiom-line bg-axiom-paper p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase text-axiom-muted">
                  ACTIVE STEP IN NARRATIVE
                </span>
                <button
                  type="button"
                  onClick={() => setStoryAutoPlay((p) => !p)}
                  className="font-mono text-[11px] text-axiom-blue hover:underline"
                >
                  {storyAutoPlay ? "Pause Auto-Trace" : "Resume Auto-Trace"}
                </button>
              </div>
              <div className="mt-3 font-mono text-xs text-axiom-muted">
                {SESSION_STORY_STEPS[activeStoryIdx].time} ·{" "}
                <span className="text-axiom-ink font-semibold">
                  {SESSION_STORY_STEPS[activeStoryIdx].type}
                </span>
              </div>
              <div className="mt-1 font-display text-xl font-bold text-axiom-ink">
                {SESSION_STORY_STEPS[activeStoryIdx].title}
              </div>
              <p className="mt-2 text-sm text-axiom-muted">
                {SESSION_STORY_STEPS[activeStoryIdx].detail}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-axiom-softline pt-3">
                <span className="font-mono text-xs text-axiom-muted">
                  Accumulated Purchase Intent
                </span>
                <span className="font-display text-2xl font-bold text-axiom-blue">
                  {SESSION_STORY_STEPS[activeStoryIdx].intentTotal}%
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onEnterWorkspace("shoppers", "shopper_4821")}
              className="mt-5 inline-flex items-center gap-2 font-mono text-xs font-semibold text-axiom-blue hover:underline"
            >
              Inspect Shopper #4821 full timeline in Command Center →
            </button>
          </div>

          {/* Vertical Event Chain Visualization */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-6 shadow-editorial">
              <div className="flex items-center justify-between border-b border-axiom-softline pb-4 mb-5">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-axiom-muted">
                    SESSION STREAM · SHOPPER #4821 (AARAV MEHTA)
                  </span>
                  <h3 className="font-display text-lg font-bold text-axiom-ink">
                    Live Micro-Behavior Chain → Autonomous Recovery
                  </h3>
                </div>
                <span className="rounded-full bg-axiom-bluesoft px-3 py-1 font-mono text-xs font-semibold text-axiom-blue">
                  INTENT 91%
                </span>
              </div>

              <div className="space-y-3">
                {SESSION_STORY_STEPS.map((step, idx) => {
                  const isActive = idx === activeStoryIdx;
                  const isAxiom = step.type === "AXIOM ENGINE";
                  return (
                    <div
                      key={step.time}
                      onClick={() => {
                        setStoryAutoPlay(false);
                        setActiveStoryIdx(idx);
                      }}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        isAxiom
                          ? "border-axiom-blue bg-axiom-bluesoft/50"
                          : isActive
                          ? "border-axiom-ink bg-white shadow-subtle"
                          : "border-axiom-softline bg-axiom-bg/50 hover:bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-axiom-muted w-16">
                            {step.time}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                              isAxiom
                                ? "bg-axiom-blue text-white"
                                : step.accent === "red"
                                ? "bg-axiom-redsoft text-axiom-red"
                                : step.accent === "amber"
                                ? "bg-axiom-ambersoft text-axiom-amber"
                                : "bg-axiom-surface text-axiom-ink"
                            }`}
                          >
                            {step.type}
                          </span>
                          <span className="font-display text-sm font-bold text-axiom-ink">
                            {step.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-xs">
                          <span className="text-axiom-blue font-semibold">
                            {step.intentDelta}
                          </span>
                          <span className="rounded bg-white px-2 py-0.5 border border-axiom-softline text-axiom-ink">
                            {step.intentTotal}%
                          </span>
                        </div>
                      </div>
                      <p className="mt-1.5 pl-[76px] text-xs text-axiom-muted">
                        {step.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 02 — AXIOM SEES WHAT ORDINARY ANALYTICS MISS
      ============================================================ */}
      <section
        id="section-02"
        className="py-20 px-4 sm:px-6 max-w-[1280px] mx-auto border-t border-axiom-line"
      >
        <div className="max-w-3xl">
          <span className="font-mono text-xs uppercase tracking-widest text-axiom-blue font-semibold">
            SECTION 02 · GRANULAR TELEMETRY
          </span>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-axiom-ink">
            AXIOM SEES WHAT ORDINARY ANALYTICS MISS.
          </h2>
          <p className="mt-4 text-base text-axiom-muted leading-relaxed">
            Traditional analytics only record pageviews and completed checkouts. Axiom captures
            16 granular shopper micro-behaviors across every category — from{" "}
            <span className="text-axiom-ink font-medium">
              black jeans, sneakers, cosmetics, and ceramic mugs
            </span>{" "}
            to{" "}
            <span className="text-axiom-ink font-medium">
              headphones, skincare, furniture, and electronics
            </span>
            .
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {MICRO_BEHAVIORS.map((mb) => (
            <div
              key={mb.code}
              className="rounded-xl border border-axiom-line bg-axiom-paper p-4 hover:border-axiom-ink transition-colors"
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-axiom-muted">
                <span>{mb.code} · {mb.category.toUpperCase()}</span>
                <span className="rounded bg-axiom-bluesoft px-1.5 py-0.5 text-axiom-blue font-semibold">
                  {mb.weight}
                </span>
              </div>
              <div className="mt-2.5 font-display text-sm font-semibold text-axiom-ink">
                {mb.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          SECTION 03 — BEHAVIOR BECOMES INTENT
      ============================================================ */}
      <section
        id="section-03"
        className="py-20 px-4 sm:px-6 max-w-[1280px] mx-auto border-t border-axiom-line"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <span className="font-mono text-xs uppercase tracking-widest text-axiom-blue font-semibold">
              SECTION 03 · INTENT ENGINE
            </span>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-axiom-ink">
              BEHAVIOR BECOMES INTENT.
            </h2>
            <p className="mt-4 text-base text-axiom-muted leading-relaxed">
              Axiom continuously normalizes micro-events into behavioral features — computing{" "}
              <code className="font-mono text-xs bg-axiom-surface px-1.5 py-0.5 rounded">
                purchaseIntentScore
              </code>
              ,{" "}
              <code className="font-mono text-xs bg-axiom-surface px-1.5 py-0.5 rounded">
                dropOffRiskScore
              </code>
              ,{" "}
              <code className="font-mono text-xs bg-axiom-surface px-1.5 py-0.5 rounded">
                confidence
              </code>
              , and an interpretable{" "}
              <code className="font-mono text-xs bg-axiom-surface px-1.5 py-0.5 rounded">
                signalBreakdown
              </code>{" "}
              for every active shopper.
            </p>
            <button
              type="button"
              onClick={() => onEnterWorkspace("intent")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-axiom-line bg-axiom-paper px-4 py-2.5 text-xs font-semibold text-axiom-ink hover:border-axiom-ink"
            >
              Open Live Intent Engine Scorer →
            </button>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-6 sm:p-8 shadow-editorial">
              <div className="grid grid-cols-3 gap-4 border-b border-axiom-softline pb-6">
                <div>
                  <span className="font-mono text-[11px] uppercase text-axiom-muted">
                    PURCHASE INTENT
                  </span>
                  <div className="mt-1 font-display text-4xl sm:text-5xl font-bold text-axiom-blue">
                    91%
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase text-axiom-muted">
                    DROP-OFF RISK
                  </span>
                  <div className="mt-1 font-display text-4xl sm:text-5xl font-bold text-axiom-red">
                    78%
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase text-axiom-muted">
                    CONFIDENCE
                  </span>
                  <div className="mt-1 font-display text-4xl sm:text-5xl font-bold text-axiom-ink">
                    94%
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between font-mono text-xs uppercase text-axiom-muted mb-4">
                  <span>SIGNAL BREAKDOWN · SHOPPER #4821</span>
                  <span>CONTRIBUTION</span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Added to cart", pts: 27, max: 30 },
                    { name: "Price checks", pts: 21, max: 30 },
                    { name: "Repeated product views", pts: 18, max: 30 },
                    { name: "Returned session", pts: 14, max: 30 },
                    { name: "Checkout hesitation", pts: 11, max: 30 },
                  ].map((sig) => (
                    <div key={sig.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-axiom-ink">{sig.name}</span>
                        <span className="font-mono font-semibold text-axiom-blue">
                          +{sig.pts}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-axiom-surface overflow-hidden">
                        <div
                          className="h-full rounded-full bg-axiom-blue"
                          style={{ width: `${(sig.pts / sig.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 04 & 05 — THEN THE MARKET CHANGES + AXIOM CONNECTS THE DOTS
      ============================================================ */}
      <section
        id="section-04"
        className="py-20 px-4 sm:px-6 max-w-[1280px] mx-auto border-t border-axiom-line"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Section 04 Card */}
          <div className="lg:col-span-6 rounded-2xl border border-axiom-line bg-axiom-paper p-7 shadow-subtle">
            <span className="font-mono text-xs uppercase tracking-widest text-axiom-blue font-semibold">
              SECTION 04 · MARKET MONITOR
            </span>
            <h3 className="mt-2 font-display text-3xl font-bold text-axiom-ink">
              THEN THE MARKET CHANGES.
            </h3>
            <p className="mt-2 text-sm text-axiom-muted">
              Axiom watches price changes, inventory depletion, stock status, and discount
              shifts in real time.
            </p>

            <div className="mt-6 rounded-xl border border-axiom-line bg-axiom-bg p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase text-axiom-muted">
                  MARKET EVENT · PRICE DROP DETECTED
                </span>
                <span className="rounded-md bg-axiom-bluesoft px-2 py-0.5 font-mono text-xs font-semibold text-axiom-blue">
                  -11.3%
                </span>
              </div>
              <div className="mt-3 font-display text-2xl font-bold text-axiom-ink">
                Black Denim
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                <span className="font-mono text-xl line-through text-axiom-muted">
                  ₹4,398
                </span>
                <span className="font-mono text-xl text-axiom-muted">→</span>
                <span className="font-display text-4xl font-bold text-axiom-blue">
                  ₹3,899
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-axiom-line pt-4 font-mono text-xs">
                <div>
                  <span className="text-axiom-muted block">Shopper intent:</span>
                  <strong className="text-axiom-ink text-sm">91% (23 shoppers)</strong>
                </div>
                <div>
                  <span className="text-axiom-muted block">Drop-off risk:</span>
                  <strong className="text-axiom-red text-sm">78% (High)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 05 Card */}
          <div
            id="section-05"
            className="lg:col-span-6 rounded-2xl border border-axiom-line bg-axiom-paper p-7 shadow-subtle"
          >
            <span className="font-mono text-xs uppercase tracking-widest text-axiom-blue font-semibold">
              SECTION 05 · OPPORTUNITY CONVERGENCE
            </span>
            <h3 className="mt-2 font-display text-3xl font-bold text-axiom-ink">
              AXIOM CONNECTS THE DOTS.
            </h3>
            <p className="mt-2 text-sm text-axiom-muted">
              When high shopper intent intersects with a live market shift and cart hesitation,
              Axiom synthesizes an actionable recovery opportunity.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-axiom-softline bg-white px-4 py-3">
                <span className="font-mono text-xs uppercase text-axiom-muted">01 · INTENT</span>
                <strong className="font-display text-sm text-axiom-ink">
                  High Purchase Intent (91% avg across 23 shoppers)
                </strong>
              </div>
              <div className="flex justify-center font-mono text-xs text-axiom-muted">+</div>
              <div className="flex items-center justify-between rounded-xl border border-axiom-softline bg-white px-4 py-3">
                <span className="font-mono text-xs uppercase text-axiom-muted">02 · MARKET</span>
                <strong className="font-display text-sm text-axiom-blue">
                  Price Drop Detected (₹4,398 → ₹3,899 · -₹499)
                </strong>
              </div>
              <div className="flex justify-center font-mono text-xs text-axiom-muted">+</div>
              <div className="flex items-center justify-between rounded-xl border border-axiom-softline bg-white px-4 py-3">
                <span className="font-mono text-xs uppercase text-axiom-muted">03 · STATE</span>
                <strong className="font-display text-sm text-axiom-red">
                  Abandoned Cart + Hesitation Loop
                </strong>
              </div>
              <div className="flex justify-center font-mono text-xs text-axiom-muted">=</div>
              <div className="flex items-center justify-between rounded-xl border border-axiom-blue bg-axiom-bluesoft/60 px-4 py-3.5">
                <div>
                  <span className="font-mono text-[10px] uppercase text-axiom-blue font-semibold">
                    RECOVERY OPPORTUNITY GENERATED
                  </span>
                  <div className="font-display text-base font-bold text-axiom-ink">
                    Notify high-intent abandoned carts · ₹89,677 Recoverable
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onActivateOpportunity("opp_black_denim_price_drop");
                    onEnterWorkspace("opportunities");
                  }}
                  className="rounded-lg bg-axiom-ink px-3.5 py-2 font-mono text-xs font-semibold text-white hover:bg-axiom-blue transition-colors"
                >
                  [ ACTIVATE ]
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 06 & 07 — AXIOM ACTS + RECOVERABLE REVENUE
      ============================================================ */}
      <section
        id="section-06"
        className="py-20 px-4 sm:px-6 max-w-[1280px] mx-auto border-t border-axiom-line"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <span className="font-mono text-xs uppercase tracking-widest text-axiom-blue font-semibold">
              SECTION 06 & 07 · AUTONOMOUS EXECUTION & RESULT
            </span>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-axiom-ink">
              AXIOM ACTS. REVENUE IS RECOVERED.
            </h2>
            <p className="mt-4 text-base text-axiom-muted leading-relaxed">
              Axiom does not merely tell an operator what happened. Axiom understands what is
              happening and dispatches targeted in-app nudges, webhooks, re-engagement flows,
              and urgency campaigns automatically.
            </p>

            {/* Executed Action Receipt */}
            <div className="mt-6 rounded-2xl border border-axiom-line bg-axiom-paper p-5 shadow-subtle">
              <div className="flex items-center justify-between border-b border-axiom-softline pb-3">
                <span className="font-mono text-[11px] font-semibold text-axiom-green uppercase">
                  ● ACTION EXECUTED
                </span>
                <span className="rounded bg-axiom-greensoft px-2 py-0.5 font-mono text-[10px] font-semibold text-axiom-green">
                  DELIVERED
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-mono text-[10px] text-axiom-muted block">TARGET</span>
                  <strong className="text-axiom-ink">Shopper #4821 · Black Denim</strong>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-axiom-muted block">TRIGGER</span>
                  <strong className="text-axiom-ink">Price dropped 11.3% · Intent 91%</strong>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-axiom-muted block">ACTION</span>
                  <strong className="text-axiom-blue">
                    In-app nudge: &ldquo;Black Denim is now ₹3,899.&rdquo;
                  </strong>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-axiom-muted block">RESULT</span>
                  <strong className="text-axiom-green">Checkout resumed · ₹3,899</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5">
              <span className="font-mono text-[10px] uppercase text-axiom-blue font-semibold">
                CHANNEL 01 · IN-APP NUDGE
              </span>
              <h4 className="mt-2 font-display text-lg font-bold text-axiom-ink">
                &ldquo;Black Denim is now ₹3,899.&rdquo;
              </h4>
              <p className="mt-1.5 text-xs text-axiom-muted">
                Injected directly into the active session DOM when a shopper in a hesitation
                loop returns to the product page.
              </p>
            </div>

            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5">
              <span className="font-mono text-[10px] uppercase text-axiom-blue font-semibold">
                CHANNEL 02 · WEBHOOK
              </span>
              <h4 className="mt-2 font-mono text-sm font-bold text-axiom-ink">
                POST /webhooks/recovery
              </h4>
              <p className="mt-1.5 text-xs text-axiom-muted">
                Signed JSON payload with shopper ID, intent breakdown, and price delta
                dispatched in 34ms.
              </p>
            </div>

            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5">
              <span className="font-mono text-[10px] uppercase text-axiom-blue font-semibold">
                CHANNEL 03 · RE-ENGAGEMENT
              </span>
              <h4 className="mt-2 font-display text-lg font-bold text-axiom-ink">
                High-Intent Abandoned Carts
              </h4>
              <p className="mt-1.5 text-xs text-axiom-muted">
                Targets only shoppers above 75% purchase intent to protect brand margin and
                eliminate discount spam.
              </p>
            </div>

            <div className="rounded-2xl border border-axiom-line bg-axiom-paper p-5">
              <span className="font-mono text-[10px] uppercase text-axiom-green font-semibold">
                CHANNEL 04 · CAMPAIGN
              </span>
              <h4 className="mt-2 font-display text-lg font-bold text-axiom-ink">
                Price Drop + High Purchase Intent
              </h4>
              <p className="mt-1.5 text-xs text-axiom-muted">
                Autonomous multi-shopper cohort activation whenever catalog price or stock
                crosses elasticity thresholds.
              </p>
            </div>

            {/* Final Editorial CTA Banner */}
            <div className="sm:col-span-2 rounded-2xl border border-axiom-ink bg-axiom-ink p-7 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-axiom-bluesoft">
                  SECTION 07 · THE RESULT: RECOVERABLE REVENUE
                </span>
                <h3 className="mt-1 font-display text-2xl sm:text-3xl font-bold">
                  {formatINR(snapshot.stats.recovered_revenue)} recovered automatically.
                </h3>
                <p className="mt-1 text-xs text-neutral-300">
                  Enter the live Axiom Command Center to inspect shoppers, opportunities,
                  market signals, and autonomous actions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEnterWorkspace("overview")}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-semibold text-axiom-ink hover:bg-axiom-bluesoft transition-colors"
              >
                LAUNCH COMMAND CENTER
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-axiom-line py-10 px-4 sm:px-6 max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-axiom-muted">
        <div className="flex items-center gap-2.5">
          <span className="font-display font-bold text-axiom-ink">AXIOM</span>
          <span>·</span>
          <span>Autonomous E-Commerce Intent & Revenue Recovery Engine</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <button type="button" onClick={() => onEnterWorkspace("overview")} className="hover:text-axiom-ink">
            Overview
          </button>
          <button type="button" onClick={() => onEnterWorkspace("signals")} className="hover:text-axiom-ink">
            Live Signals
          </button>
          <button type="button" onClick={() => onEnterWorkspace("opportunities")} className="hover:text-axiom-ink">
            Opportunities
          </button>
          <button type="button" onClick={() => onEnterWorkspace("market")} className="hover:text-axiom-ink">
            Market Monitor
          </button>
        </div>
      </footer>
    </div>
  );
}
