import { panel, pct, int, grid, select, table, note, fixed } from "../ui.js";
import { chartBox, lineChart } from "../charts.js";

export default async function (view, ctx) {
  const q = new URLSearchParams(ctx.args.join("/").replace(/^\?/, ""));
  const by = q.get("by") || "cohort", segment = q.get("segment") || "";
  const d = await ctx.api("/survival", { params: { by, segment } });
  ctx.setControls(select("s-by", "Compare by", [["cohort", "Redesign cohort"], ["company_size", "Company size"], ["channel", "Channel"]], by) +
    select("s-seg", "Restrict to size", [["", "All"], ...d.options.sizes.map((s) => [s, s])], segment));
  const go = () => { location.hash = `#/workspace/survival/?by=${document.getElementById("s-by").value}&segment=${document.getElementById("s-seg").value}`; };
  ["s-by", "s-seg"].forEach((id) => (document.getElementById(id).onchange = go));

  view.innerHTML =
    panel("Survival curves", "Probability an account is still subscribed by days since conversion (shaded = 95% CI)", chartBox("c-km", 340)) + `<div style="height:16px"></div>` +
    grid("g2", panel("Groups", "", table([{ label: "Group", key: "name" }, { label: "Accounts", num: true, render: (r) => int(r.n) }, { label: "Churned", num: true, render: (r) => int(r.events) },
      { label: "Median survival", num: true, render: (r) => (r.median_days == null ? "not reached" : `${int(r.median_days)} d`) }], d.curves), { flush: true }),
      panel("Redesign effect (log-rank test)", `Pre vs post redesign, redesign date ${d.redesign_date}`,
        table([{ label: "Segment", key: "segment" }, { label: "Pre / post n", num: true, render: (r) => `${int(r.n_pre)} / ${int(r.n_post)}` },
          { label: "Churn pre → post", num: true, render: (r) => `${pct(r.churn_pre)} → ${pct(r.churn_post)}` },
          { label: "p-value", num: true, render: (r) => `${fixed(r.p_value, 4)}${r.p_value < 0.05 ? " *" : ""}` }], d.redesign_tests), { flush: true })) +
    note("* p < 0.05. Curves are censored at today for active accounts. Cohort labels come from REDESIGN_DATE.");
  lineChart(document.getElementById("c-km"), d.curves.map((c) => ({ name: c.name.replace(/_/g, " "), points: c.points.map((p) => ({ x: p.t, y: p.s, lo: p.lo, hi: p.hi })) })),
    { step: true, yMin: 0, yMax: 1, yFmt: (v) => `${Math.round(v * 100)}%`, xLabel: "Days since conversion", height: 340, xFmt: (v) => `${Math.round(v)}d` });
}