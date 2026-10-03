import { panel, pct, int, money, grid, select, table, note } from "../ui.js";
import { chartBox, lineChart, hbars } from "../charts.js";

const METRICS = {
signups:         { name: "Signups",            fmt: int },
activation_rate: { name: "Activation",         fmt: pct, max: 1 },
conversion_rate: { name: "Conversion to paid", fmt: pct, max: 1 },
retained_90:     { name: "90-day retention",   fmt: pct, max: 1 },
churn_rate:      { name: "Churn",              fmt: pct, max: 1 },
mrr:             { name: "Active MRR",         fmt: money },
};
const nice = (c) => String(c).replace(/_/g, " ");

export default async function (view, ctx) {
const d = await ctx.api("/acquisition");
const q = new URLSearchParams(ctx.args.join("/").replace(/^\?/, ""));
const metric = METRICS[q.get("metric")] ? q.get("metric") : "conversion_rate";
const m = METRICS[metric];

ctx.setControls(select("m-metric", "Compare channels by", Object.entries(METRICS).map(([k, v]) => [k, v.name]), metric));
document.getElementById("m-metric").onchange = (e) => {
location.hash = `#/workspace/acquisition/?metric=${e.target.value}`;
};

const rows = d.channels.filter((r) => r[metric] != null).sort((a, b) => b[metric] - a[metric]);
const months = [...new Set(d.monthly.map((r) => r.month))].sort();
const series = d.channels.map((c) => ({
name: nice(c.channel),
points: months.map((mo, i) => ({
    x: i,
    y: d.monthly.find((r) => r.month === mo && r.channel === c.channel)?.signups ?? 0,
})),
}));

view.innerHTML =
grid("g21",
    panel(`${m.name} by channel`, "Best to worst",
    hbars(rows.map((r) => ({ name: nice(r.channel), value: r[metric], text: m.fmt(r[metric]), sub: `${int(r.signups)} signups` })), { max: m.max })),
    panel("Channel scorecard", "",
    table([
        { label: "Channel", render: (r) => nice(r.channel) },
        { label: "Signups", num: true, render: (r) => int(r.signups) },
        { label: "Activation", num: true, render: (r) => pct(r.activation_rate) },
        { label: "Conversion", num: true, render: (r) => pct(r.conversion_rate) },
        { label: "90d retention", num: true, render: (r) => pct(r.retained_90) },
        { label: "Churn", num: true, render: (r) => pct(r.churn_rate) },
        { label: "MRR", num: true, render: (r) => money(r.mrr) },
    ], d.channels), { flush: true })) +
panel("Signups by month and channel", "New accounts", chartBox("c-ch", 260)) +
note("Activation = the primary user created a first task during onboarding. 90-day retention only counts accounts old enough to be observed at 90 days. Churn = churned / converted accounts.") +
`<p class="subnav"><a href="#/workspace/users">Full acquisition mix →</a></p>`;

lineChart(document.getElementById("c-ch"), series, { categories: months, yFmt: int, height: 260 });
}