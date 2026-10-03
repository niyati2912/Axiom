import { panel, pct, int, grid, kpi, label, table } from "../ui.js";
import { chartBox, barChart, hbars } from "../charts.js";

export default async function (view, ctx) {
  const d = await ctx.api("/users");
  const conv = (rows) => hbars(rows.map((r) => ({ name: r.key.replace(/_/g, " "), value: r.rate, text: pct(r.rate), sub: `${int(r.converted)} of ${int(r.n)}` })), { max: 1 });
  view.innerHTML =
    grid("g4", kpi("Accounts", int(d.by_channel.reduce((a, r) => a + r.n, 0))), kpi("Users (seats)", int(d.total_users)),
      ...d.seats_by_size.map((s) => kpi(`Avg users / ${s.key} account`, s.avg_users.toFixed(1)))) +
    grid("g2", panel("Signups by month", "New accounts", chartBox("c-signups", 240)),
      panel("Accounts by acquisition channel", "", hbars(d.by_channel.map((r) => ({ name: r.key.replace(/_/g, " "), value: r.n, text: int(r.n) }))))) +
    grid("g2", panel("Conversion to paid by channel", "Share of signups that became paying", conv(d.conversion_by_channel)),
      panel("Conversion to paid by company size", "", conv(d.conversion_by_size))) +
    panel("Feature usage", "Total usage events and accounts using each feature",
      table([{ label: "Feature", render: (r) => label(r.feature_name) }, { label: "Events", num: true, render: (r) => int(r.events) }, { label: "Accounts", num: true, render: (r) => int(r.accounts) }], d.feature_usage), { flush: true });
  barChart(document.getElementById("c-signups"), d.signups_by_month.map((r) => ({ label: r.month, value: r.n })), { yFmt: int });
}