import {
  kpi,
  panel,
  pct,
  int,
  money,
  callout,
  grid
} from "../ui.js";

import {
  chartBox,
  lineChart,
  barChart,
  hbars
} from "../charts.js";


export default async function(view, ctx) {

  const d = await ctx.api("/overview");

  const k = d.kpis;

  const insights =
    d.insights?.length
      ? d.insights
          .map((i) =>
            callout(
              i.title,
              i.evidence,
              i.investigate,
              i.page
            )
          )
          .join("")
      : `
          <div class="empty">
            Not enough data to generate a signal yet.
          </div>
        `;


  view.innerHTML = `

    <!-- COMMAND / SNAPSHOT -->

    <section class="overview-hero">

      <div class="overview-copy">

        <span class="overview-eyebrow">
          FLOWDESK / PRODUCT INTELLIGENCE
        </span>

        <h2>
          Here's what changed
          <span>across your product.</span>
        </h2>

        <p>
          Flowdesk combines behavioral activity,
          lifecycle events and customer signals
          to surface the things worth investigating.
        </p>

      </div>

      <div class="overview-live">

        <span class="live-dot"></span>

        <div>
          <strong>Data connected</strong>
          <small>PostgreSQL · Current dataset</small>
        </div>

      </div>

    </section>


    <!-- KPI SIGNALS -->

        <section class="signal-kpi-grid">
      ${kpi("Active accounts", int(k.active_subscriptions), `${int(k.accounts)} signups in total`)}
      ${kpi("Activation", pct(k.activation_rate), "created a first task")}
      ${kpi("Day-7 return", pct(k.day7_return_rate), "came back after a week")}
      ${kpi("Conversion", pct(k.conversion_rate), "signup → paid")}
      ${kpi("MRR", money(k.mrr), "active subscriptions")}
      ${kpi("Churn", pct(k.churn_rate), `${int(k.churned_subscriptions)} of ${int(k.converted_accounts)} paid accounts`)}
    </section>

    <!-- JOURNEY -->

    <section class="journey-panel">

      <div class="journey-header">

        <div>

          <span class="panel-kicker">
            PRODUCT JOURNEY
          </span>

          <h3>
            Where users move —
            and where they disappear.
          </h3>

        </div>

        <a href="#/workspace/funnel">
          Explore activation
          →
        </a>

      </div>

      <div class="journey-track">

        <div class="journey-stage">

          <span class="stage-index">01</span>

          <div class="stage-main">
            <strong>Acquisition</strong>
            <small>Users enter the product</small>
          </div>

          <span class="stage-value">
            100%
          </span>

        </div>

        <div class="journey-bridge"></div>

        <div class="journey-stage">

          <span class="stage-index">02</span>

          <div class="stage-main">
            <strong>Activation</strong>
            <small>First meaningful action</small>
          </div>

          <span class="stage-value">
            ${pct(k.conversion_rate)}
          </span>

        </div>

        <div class="journey-bridge"></div>

        <div class="journey-stage">

          <span class="stage-index">03</span>

          <div class="stage-main">
            <strong>Engagement</strong>
            <small>Feature adoption & usage</small>
          </div>

          <span class="stage-value">
            →
          </span>

        </div>

        <div class="journey-bridge"></div>

        <div class="journey-stage">

          <span class="stage-index">04</span>

          <div class="stage-main">
            <strong>Retention</strong>
            <small>Long-term product value</small>
          </div>

          <span class="stage-value">
            →
          </span>

        </div>

      </div>

    </section>


    <!-- TIME SERIES -->

    ${grid(
      "g21",
      panel(
        "Product movement",
        "Signups, conversions and churn over time",
        chartBox("c-timeline", 290)
      ),

      panel(
        "Churn by segment",
        "Converted accounts that eventually churned",
        hbars(
          d.churn_by_size.map((r) => ({
            name: String(r.key).replace(/_/g, " "),
            value: r.rate,
            text: pct(r.rate),
            sub: `${int(r.churned)} / ${int(r.n)}`
          })),
          { max: 1 }
        )
      )
    )}


    <!-- PAYING ACCOUNTS / SIGNALS -->

    ${grid(
      "g2",
      panel(
        "Paying accounts",
        "Active subscriptions at month end",
        chartBox("c-paying", 260)
      ),

      `
        <section class="signal-panel">

          <div class="signal-panel-header">

            <div>

              <span class="panel-kicker">
                GENERATED FROM DATA
              </span>

              <h3>
                Signals worth investigating
              </h3>

            </div>

            <span class="signal-star">✦</span>

          </div>

          <div class="insight-stack">
            ${insights}
          </div>

        </section>
      `
    )}

  `;


  barChart(
    document.getElementById("c-timeline"),
    d.timeline.map((r) => ({
      label: r.month,
      ...r
    })),
    {
      keys: [
        "signups",
        "conversions",
        "churned"
      ],
      names: [
        "Signups",
        "Conversions",
        "Churned"
      ],
      yFmt: int
    }
  );


  lineChart(
    document.getElementById("c-paying"),
    [
      {
        name: "Paying accounts",
        points: d.paying_accounts.map(
          (r, i) => ({
            x: i,
            y: r.paying_accounts
          })
        )
      }
    ],
    {
      categories:
        d.paying_accounts.map(
          (r) => r.month
        ),

      yFmt: int,

      height: 240
    }
  );

}