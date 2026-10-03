# AXIOM — System Architecture & Engineering Specification

![Axiom System Architecture Topology](assets/axiom-architecture-graph.svg)

---

## 1. Architectural Philosophy

**Axiom** is designed as an **event-driven, closed-loop autonomous commerce intelligence engine** rather than a passive reporting dashboard. Every layer of the stack is engineered around sub-second progression from **granular shopper telemetry** to **autonomous revenue recovery**.

```mermaid
flowchart TB
    subgraph Storefront["01 · Storefront & Edge Telemetry"]
        S1["Search Queries ('black jeans')"]
        S2["Product Views & Dwell Time (4x)"]
        S3["Cart Add / Abandon Events"]
        S4["Repeated Price Checks (3x)"]
        S5["Watchlist & Stock Checks"]
    end

    subgraph Ingestion["02 · FastAPI Event Ingestion & Normalization"]
        API_IN["POST /api/events/ingest"]
        SIM["Event Simulator (simulation.py)"]
        NORM["Canonical ShopperEvent Normalizer"]
    end

    subgraph CoreEngine["03 · Axiom Autonomous Intelligence Core"]
        STORE[("Thread-Safe DataStore + SQLite Ledger\n(store.py / persistence.py)")]
        IE["Purchase-Intent & Risk Engine\n(intent_engine.py)"]
        MM["Market Condition Monitor\n(market_monitor.py)"]
        OD["Opportunity Synthesis Engine\n(opportunity_detector.py)"]
    end

    subgraph Execution["04 · Autonomous Action & Transport Layer"]
        ACT1["In-App Storefront Nudge"]
        ACT2["Webhook Outbox (POST /webhooks/recovery)"]
        ACT3["High-Intent Cohort Campaigns"]
        STREAM["Real-Time Broadcast (SSE /api/stream + WS /ws)"]
    end

    subgraph Client["05 · Next.js 14 + TypeScript + Three.js Frontend"]
        NET3D["3D WebGL Signal Topology (CommerceNetwork3D.tsx)"]
        LAND["7-Section Editorial Story (LandingView.tsx)"]
        CMD["12-View Command Center (CommandCenter.tsx)"]
    end

    S1 & S2 & S3 & S4 & S5 --> API_IN
    SIM --> NORM
    API_IN --> NORM
    NORM --> STORE
    STORE --> IE
    STORE --> MM
    IE & MM --> OD
    OD --> ACT1 & ACT2 & ACT3
    OD --> STREAM
    STORE --> STREAM
    STREAM --> NET3D & LAND & CMD
```

---

## 2. Intent Scoring & Drop-Off Risk Mathematics

![Intent vs Drop-off Risk Trajectory Graph](assets/axiom-intent-curve.svg)

Axiom's [`IntentEngine`](../backend/intent_engine.py) extracts 12+ behavioral features per active shopper session and computes four primary outputs:

1. **`purchaseIntentScore` ($\in [0, 1]$)**:
   $$\text{Intent}(s) = \text{clip}\left(\frac{1}{100}\sum_{k \in \mathcal{S}} w_k \cdot \phi_k(s) \cdot \gamma(\Delta t_k),\; 0.18,\; 0.97\right)$$
   where $\phi_k(s)$ represents normalized behavioral signal intensity, $w_k$ is the signal weight, and $\gamma(\Delta t_k)$ is the recency decay factor.

2. **`dropOffRiskScore` ($\in [0, 1]$)**:
   $$\text{Risk}(s) = \text{clip}\left(r_0 + 0.22 \cdot \mathbb{I}_{\text{abandon}} + \min(0.24,\; 0.06 \cdot n_{\text{price\_check}}) + 0.12 \cdot \mathbb{I}_{\text{hesitation\_loop}},\; 0.15,\; 0.92\right)$$

3. **`hesitationLoopDetected` ($\in \{\text{true}, \text{false}\}$)**:
   Triggered when a shopper exhibits high product affinity alongside price friction:
   $$\text{HesitationLoop}(s) \iff \left(n_{\text{views}} \ge 3 \land n_{\text{cart}} \ge 1 \land n_{\text{price\_check}} \ge 2 \land n_{\text{return\_sessions}} \ge 1\right)$$

4. **`signalBreakdown`**:
   An interpretable dictionary mapping each behavioral driver to its exact point contribution:

| Behavioral Signal | Code | Max Contribution |Shopper `#4821` Example |
| :--- | :--- | :---: | :---: |
| **Added to cart** | `SIG_CART` | `+30.0` | **`+27.0`** |
| **Price checks** | `SIG_PRICE` | `+24.0` | **`+21.0`** |
| **Repeated product views** | `SIG_VIEW` | `+26.0` | **`+18.0`** |
| **Returned session** | `SIG_RETURN` | `+18.0` | **`+14.0`** |
| **Checkout hesitation** | `SIG_HESITATE` | `+15.0` | **`+11.0`** |
| **Total Accumulated Score** | — | `100.0` | **`91% Intent` / `78% Risk` / `94% Confidence`** |

---

## 3. Data Model & Entity Relationships

```mermaid
erDiagram
    SHOPPER ||--o{ SHOPPER_EVENT : generates
    SHOPPER ||--|| INTENT_SCORE : scored_by
    PRODUCT ||--o{ SHOPPER_EVENT : referenced_in
    PRODUCT ||--o{ MARKET_EVENT : experiences
    PRODUCT ||--o{ OPPORTUNITY : unlocks
    SHOPPER }o--o{ OPPORTUNITY : targeted_in
    OPPORTUNITY ||--o{ RECOVERY_ACTION : dispatches
    RECOVERY_ACTION ||--o| WEBHOOK_DELIVERY : emits

    SHOPPER {
        string id PK
        string display_id "#4821"
        string name "Aarav Mehta"
        float intent_score "0.91"
        float risk_score "0.78"
        float confidence "0.94"
        boolean hesitation_loop "true"
        json signal_breakdown
        json behavioral_features
    }

    PRODUCT {
        string id PK
        string name "Black Denim"
        string category "Denim & Apparel"
        float price "3899"
        float original_price "4398"
        int inventory "38"
        int wishlist_count "184"
        int cart_adds "61"
        float price_change_pct "-11.3"
    }

    MARKET_EVENT {
        string id PK
        string product_id FK
        string event_type "price_drop | low_stock"
        float old_value "4398"
        float new_value "3899"
        float change_pct "-11.3"
        int affected_shoppers "23"
    }

    OPPORTUNITY {
        string id PK
        string title "HIGH INTENT + PRICE DROP"
        string opportunity_type
        string product_id FK
        int shopper_count "23"
        float avg_intent "0.91"
        float revenue_potential "89677"
        string recommended_action
        string status "active | activated"
    }

    RECOVERY_ACTION {
        string id PK
        string action_type "in_app_nudge | webhook"
        string shopper_display_id "#4821"
        string product_name "Black Denim"
        string trigger "Price dropped 11.3%"
        string status "delivered | converted"
        float revenue_recovered "3899"
    }
```

---

## 4. 3D WebGL Commerce Signal Network Pipeline

The [`CommerceNetwork3D.tsx`](../src/components/three/CommerceNetwork3D.tsx) component visualizes the invisible signal graph underneath the store using a hybrid **Three.js WebGL + Projected 2D Telemetry Overlay** pipeline:

1. **WebGL Scene Graph (`THREE.Scene`)**:
   - **Orbital Rings**: Dual counter-rotating `THREE.RingGeometry` meshes establish spatial depth.
   - **3D Semantic Nodes**: 9 `THREE.SphereGeometry` + halo ring groups positioned in 3D coordinates (`SHOPPER #4821`, `SEARCH`, `PRODUCT`, `WATCHLIST`, `CART`, `HESITATION`, `INTENT 91%`, `MARKET EVENT`, `RECOVERY`).
   - **Curved 3D Filaments**: 12 `THREE.CubicBezierCurve3` splines connecting causal stages.
   - **Animated Signal Packets**: High-frequency `THREE.Mesh` spheres traversing each 3D Bezier curve at variable velocities (`t * speed + offset mod 1`).
2. **3D-to-2D Frustum Projection**:
   - On every animation frame, each 3D node's world position $\mathbf{p} \in \mathbb{R}^3$ is projected through the `THREE.PerspectiveCamera` matrix (`worldPos.project(camera)`).
   - Normalized device coordinates $(x_{\text{ndc}}, y_{\text{ndc}}) \in [-1, 1]^2$ map to pixel coordinates:
     $$x_{\text{screen}} = \left(\frac{x_{\text{ndc}} + 1}{2}\right) W, \qquad y_{\text{screen}} = \left(\frac{1 - y_{\text{ndc}}}{2}\right) H$$
   - Interactive glass telemetry pills anchor to $(x_{\text{screen}}, y_{\text{screen}})$, providing crisp typography with true 3D parallax.
