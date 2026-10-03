"use client";

import React, { useEffect, useState, useCallback } from "react";
import LandingView from "@/components/landing/LandingView";
import CommandCenter from "@/components/workspace/CommandCenter";
import { AxiomSnapshot, WorkspaceSection } from "@/types/axiom";
import {
  INITIAL_SNAPSHOT,
  fetchSnapshot,
  activateOpportunityApi,
  ingestEventApi,
  simulateMarketEventApi,
  toggleCampaignApi,
  sendTestWebhookApi,
} from "@/lib/api";

export default function AxiomAppPage() {
  const [mode, setMode] = useState<"landing" | "workspace">("landing");
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("overview");
  const [selectedShopperId, setSelectedShopperId] = useState<string>("shopper_4821");
  const [snapshot, setSnapshot] = useState<AxiomSnapshot>(INITIAL_SNAPSHOT);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  const syncFromBackend = useCallback(async () => {
    const data = await fetchSnapshot();
    if (data) {
      setSnapshot(data);
      setIsLiveConnected(true);
    }
  }, []);

  // Initial hydration + periodic snapshot sync + SSE real-time stream
  useEffect(() => {
    syncFromBackend();
    const pollTimer = setInterval(syncFromBackend, 3500);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/stream");
      eventSource.onopen = () => setIsLiveConnected(true);
      eventSource.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "shopper_event" && msg.data) {
            setSnapshot((prev) => ({
              ...prev,
              events: [msg.data, ...prev.events.filter((x) => x.id !== msg.data.id)].slice(0, 60),
              stats: {
                ...prev.stats,
                total_events: prev.stats.total_events + 1,
              },
            }));
          } else if (msg.type === "market_event" && msg.data) {
            setSnapshot((prev) => ({
              ...prev,
              market_events: [
                msg.data,
                ...prev.market_events.filter((x) => x.id !== msg.data.id),
              ].slice(0, 30),
            }));
          } else if (msg.type === "opportunity" && msg.data) {
            setSnapshot((prev) => ({
              ...prev,
              opportunities: [
                msg.data,
                ...prev.opportunities.filter((x) => x.id !== msg.data.id),
              ].slice(0, 30),
            }));
          } else if (msg.type === "action" && msg.data) {
            setSnapshot((prev) => ({
              ...prev,
              actions: [
                msg.data,
                ...prev.actions.filter((x) => x.id !== msg.data.id),
              ].slice(0, 30),
            }));
          } else if (msg.type === "stats_update" && msg.data) {
            setSnapshot((prev) => ({
              ...prev,
              stats: msg.data,
            }));
          }
        } catch {
          // ignore malformed frame
        }
      };
    } catch {
      // Fallback to polling if SSE unavailable
    }

    return () => {
      clearInterval(pollTimer);
      eventSource?.close();
    };
  }, [syncFromBackend]);

  const handleEnterWorkspace = (section: WorkspaceSection = "overview", shopperId?: string) => {
    setActiveSection(section);
    if (shopperId) {
      setSelectedShopperId(shopperId);
    }
    setMode("workspace");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleActivateOpportunity = async (oppId: string) => {
    const res = await activateOpportunityApi(oppId);
    if (res) {
      await syncFromBackend();
    } else {
      // Optimistic fallback if backend is warming up
      setSnapshot((prev) => {
        const target = prev.opportunities.find((o) => o.id === oppId);
        const addedRev = target ? target.product_price : 3899;
        return {
          ...prev,
          opportunities: prev.opportunities.map((o) =>
            o.id === oppId ? { ...o, status: "activated" } : o
          ),
          stats: {
            ...prev.stats,
            actions_triggered: prev.stats.actions_triggered + 1,
            recovered_revenue: prev.stats.recovered_revenue + addedRev,
          },
        };
      });
    }
  };

  const handleIngestEvent = async (
    shopperId: string,
    eventType: string,
    productId?: string,
    query?: string
  ) => {
    const res = await ingestEventApi({
      shopper_id: shopperId,
      event_type: eventType,
      product_id: productId,
      search_query: query,
    });
    if (res) {
      await syncFromBackend();
    }
  };

  const handleSimulateMarketEvent = async (
    productId: string,
    eventType: string,
    newValue?: number
  ) => {
    const res = await simulateMarketEventApi({
      product_id: productId,
      event_type: eventType,
      new_value: newValue,
    });
    if (res) {
      await syncFromBackend();
    }
  };

  const handleToggleCampaign = async (campaignId: string) => {
    const res = await toggleCampaignApi(campaignId);
    if (res) {
      await syncFromBackend();
    } else {
      setSnapshot((prev) => ({
        ...prev,
        campaigns: prev.campaigns.map((c) =>
          c.id === campaignId
            ? { ...c, status: c.status === "active" ? "paused" : "active" }
            : c
        ),
      }));
    }
  };

  const handleSendTestWebhook = async () => {
    const res = await sendTestWebhookApi();
    if (res) {
      await syncFromBackend();
    }
  };

  if (mode === "workspace") {
    return (
      <CommandCenter
        snapshot={snapshot}
        activeSection={activeSection}
        selectedShopperId={selectedShopperId}
        onSelectSection={setActiveSection}
        onSelectShopper={setSelectedShopperId}
        onBackToLanding={() => setMode("landing")}
        onActivateOpportunity={handleActivateOpportunity}
        onIngestEvent={handleIngestEvent}
        onSimulateMarketEvent={handleSimulateMarketEvent}
        onToggleCampaign={handleToggleCampaign}
        onSendTestWebhook={handleSendTestWebhook}
        isLiveConnected={isLiveConnected}
      />
    );
  }

  return (
    <LandingView
      snapshot={snapshot}
      onEnterWorkspace={handleEnterWorkspace}
      onActivateOpportunity={handleActivateOpportunity}
    />
  );
}
