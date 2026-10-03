import { panel, pct, int, money, grid, kpi, select, table, badge, featureLabel, note, esc } from "../ui.js";
import { hbars, divergingBars } from "../charts.js";

export default async function (view, ctx) {
  const q = new URLSearchParams(ctx.args.join("/").replace(/^\?/, ""));
  const tier = q.get("tier") || "";
  const d = await ctx.api("/predictions", { params: { tier, limit: 100 } });
  const s = d.summary;
  ctx.setControls(select("p-tier", "Risk tier", [["", "All active"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]], tier));
  document.getElementById("p-tier").onchange = (e) => { location.hash = `#/workspace/predictions/?tier=${e.target.value}`; };

  view.innerHTML =
    `<p class="subnav"><a href="#/workspace/churn">Who is churning →</a> · <a href="#/workspace/behavior">Behavior signals →</a> · <a href="#/workspace/feedback">Exit feedback →</a> · <a href="#/workspace/accounts/">All accounts →</a></p>` +
    grid("g4", kpi("Active accounts scored", int(s.active_accounts)), kpi("Expected churners", s.expected_churn.toFixed(0), "Sum of predicted probabilities"),
      kpi("MRR at risk", money(s.mrr_at_risk), "Probability-weighted"), kpi("High-risk MRR", money(s.high_risk_mrr), `${int(s.tiers.high)} accounts`)) +
    panel("Highest-risk active accounts", d.note,
      table([{ label: "Account", render: (r) => `<a href="#/workspace/accounts/${r.account_id}">${r.account_id}</a>` }, { label: "Risk", num: true, render: (r) => pct(r.risk) },
        { label: "Tier", render: (r) => badge(r.tier) }, { label: "Size", key: "company_size" }, { label: "Channel", render: (r) => esc(r.channel.replace(/_/g, " ")) },
        { label: "MRR", num: true, render: (r) => money(r.mrr) }, { label: "Wk-1 features", num: true, key: "week1_feature_count" },
        { label: "Wk-1 ticket", render: (r) => (r.had_week1_ticket ? "Yes" : "No") },
        { label: "Top drivers", render: (r) => r.drivers.map((x) => `${x.effect > 0 ? "▲" : "▼"} ${esc(featureLabel(x.feature))}`).join(" · ") }], d.rows), { flush: true }) +
    `<div style="height:16px"></div><div id="what-if"></div>`;

  const wi = document.getElementById("what-if");
  wi.innerHTML = panel("Score a hypothetical account", "Runs the trained model on the inputs below",
    `<div class="form-grid" style="max-width:560px">
      ${select("w-channel", "Channel", ["organic", "paid_search", "referral", "content"].map((c) => [c, c.replace(/_/g, " ")]))}
      ${select("w-size", "Company size", ["solo", "team", "enterprise"].map((c) => [c, c]))}
      <label class="field">Features used in week 1<input type="number" id="w-feat" min="0" max="6" value="2"></label>
      ${select("w-tick", "Support ticket in week 1", [["false", "No"], ["true", "Yes"]])}
    </div><p><button class="btn" id="w-go">Score</button></p><div id="w-out"></div>`);
  document.getElementById("w-go").onclick = async () => {
    const out = document.getElementById("w-out");
    try {
      const r = await ctx.api("/predict", { method: "POST", body: {
        channel: document.getElementById("w-channel").value, company_size: document.getElementById("w-size").value,
        week1_feature_count: parseInt(document.getElementById("w-feat").value || "0", 10), had_week1_ticket: document.getElementById("w-tick").value === "true" } });
      out.innerHTML = `<div class="big">${pct(r.churn_probability)}</div><p class="note">Baseline (average account): ${pct(r.baseline_probability)}. Bars show each factor's push on the log-odds of churn (red raises risk).</p>` +
        divergingBars(r.drivers.map((x) => ({ name: featureLabel(x.feature), value: x.effect, text: (x.effect > 0 ? "+" : "") + x.effect.toFixed(2) })));
    } catch (e) { out.innerHTML = `<div class="error">${esc(e.message)}</div>`; }
  };
}