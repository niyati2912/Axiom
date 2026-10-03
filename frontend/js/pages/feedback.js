import { panel, pct, int, grid, kpi, table, label, esc, note, fixed } from "../ui.js";
import { chartBox, barChart, hbars, heatTable } from "../charts.js";

export default async function (view, ctx) {
  const d = await ctx.api("/feedback");
  if (!d.total) { view.innerHTML = `<div class="empty">No exit survey responses yet.</div>`; return; }
  const reasons = d.reasons.map((r) => r.reason_category);
  const cross = (list) => heatTable(list.map((r) => r.key), reasons, (k, rc) => { const row = list.find((x) => x.key === k); return row?.reasons[rc] != null ? { value: row.reasons[rc], n: row.n } : undefined; }, { rowLabel: "", fmt: (v) => `${(v * 100).toFixed(0)}%` });
  view.innerHTML =
    grid("g3", kpi("Exit surveys", int(d.total)), kpi("Average satisfaction", `${fixed(d.avg_satisfaction, 2)} / 5`), kpi("Top reason", label(d.reasons[0].reason_category), pct(d.reasons[0].share))) +
    grid("g2", panel("Stated reasons for leaving", "Share of exit surveys", hbars(d.reasons.map((r) => ({ name: r.reason_category.replace(/_/g, " "), value: r.share, text: pct(r.share), sub: `avg rating ${fixed(r.avg, 1)}` })), { max: 1 })),
      panel("Satisfaction rating distribution", "", chartBox("c-sat", 200))) +
    grid("g2", panel("Reasons by company size", "Share of each segment's exit surveys", cross(d.reasons_by_size)), panel("Reasons by channel", "", cross(d.reasons_by_channel))) +
    grid("g2", panel("Features named in feedback text", "Mentions of product features in free text", d.requested_features.length ? hbars(d.requested_features.map((r) => ({ name: r.feature.replace(/_/g, " "), value: r.mentions, text: int(r.mentions) }))) : `<div class="empty">No feature mentions</div>`),
      panel("Average satisfaction by month", "", chartBox("c-sm", 200))) +
    panel("Recent responses", "", table([{ label: "Date", key: "response_ts" }, { label: "Account", render: (r) => `<a href="#/workspace/accounts/${r.account_id}">${r.account_id}</a>` }, { label: "Size", key: "company_size" },
      { label: "Rating", num: true, key: "satisfaction_rating" }, { label: "Reason", render: (r) => label(r.reason_category) }, { label: "Comment", render: (r) => `<span style="white-space:normal">${esc(r.feedback_text)}</span>` }], d.recent), { flush: true }) +
    note("Exit surveys exist only for churned accounts, so they explain stated reasons, not what retained users think.");
  barChart(document.getElementById("c-sat"), d.satisfaction_distribution.map((r) => ({ label: String(r.rating), value: r.n })), { yFmt: int, height: 200 });
  barChart(document.getElementById("c-sm"), d.per_month.map((r) => ({ label: r.month, value: +r.avg_satisfaction.toFixed(2) })), { height: 200 });
}