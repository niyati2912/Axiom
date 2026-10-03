import { panel, pct, int, grid, kpi, label, note } from "../ui.js";
import { chartBox, barChart, hbars, heatTable } from "../charts.js";

const rows = (list, fmtKey = (k) => String(k).replace(/_/g, " ")) =>
  hbars(list.map((r) => ({ name: fmtKey(r.key), value: r.rate, text: pct(r.rate), sub: `${int(r.churned)} of ${int(r.n)}` })), { max: 1 });

export default async function (view, ctx) {
  const d = await ctx.api("/churn");
  const sizes = [...new Set(d.size_x_adoption.map((r) => r.company_size))];
  const buckets = ["0", "1-2", "3+"];
  view.innerHTML =
    grid("g3", kpi("Overall churn rate", pct(d.overall_rate)),
      kpi("Median tenure at churn", d.tenure_at_churn.median_days == null ? "–" : `${int(d.tenure_at_churn.median_days)} days`),
      kpi("Mean tenure at churn", d.tenure_at_churn.mean_days == null ? "–" : `${int(d.tenure_at_churn.mean_days)} days`)) +
    grid("g3", panel("Who: company size", "", rows(d.by_size)), panel("Who: acquisition channel", "", rows(d.by_channel)), panel("Who: plan", "", rows(d.by_plan))) +
    grid("g3", panel("Why: features used in week 1", "Churn rate by distinct features used in the first 7 days", rows(d.by_week1_features, (k) => `${k} feature${k === 1 ? "" : "s"}`)),
      panel("Why: support ticket in week 1", "", rows(d.by_week1_ticket, (k) => (k === "yes" ? "Had ticket" : "No ticket"))),
      panel("Why: lifetime support tickets", "Capped at 4+", rows(d.by_ticket_count, (k) => `${k}${k >= 4 ? "+" : ""} tickets`))) +
    grid("g2", panel("Segment x early adoption", "Churn rate by company size and week-1 feature count (hover for n)",
      heatTable(sizes, buckets, (r, c) => { const x = d.size_x_adoption.find((v) => v.company_size === r && v.week1_bucket === c); return x && { value: x.rate, n: x.n }; }, { rowLabel: "Company size" })),
      panel("Churn events by month", "Subscriptions ending each month", chartBox("c-churn", 220))) + note(d.note);
  barChart(document.getElementById("c-churn"), d.churned_per_month.map((r) => ({ label: r.month, value: r.n })), { yFmt: int, height: 220 });
}