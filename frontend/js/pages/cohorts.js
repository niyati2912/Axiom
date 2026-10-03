import { panel, pct, int, grid, table, note } from "../ui.js";
import { heatTable } from "../charts.js";

export default async function (view, ctx) {
const d = await ctx.api("/retention");
const H = d.horizons;
const months = d.cohorts.map((c) => c.month);
const byMonth = Object.fromEntries(d.cohorts.map((c) => [c.month, c]));
const sizes = [...new Set(d.conversion_by_month_size.map((r) => r.company_size))];
const pct0 = (v) => `${(v * 100).toFixed(0)}%`;

view.innerHTML =
panel("Cohort retention", "Rows: the month accounts signed up. Columns: share of converted accounts still paying N days after converting. Blank = cohort too young to observe.",
    heatTable(months, H.map((h) => `${h}d`), (m, c) => {
    const h = parseInt(c, 10), x = byMonth[m];
    const v = x?.[`retained_${h}`];
    return v == null ? undefined : { value: v, n: x[`eligible_${h}`] };
    }, { rowLabel: "Signup month", fmt: pct0 })) +
`<div style="height:16px"></div>` +
grid("g2",
    panel("Signup cohorts", "Conversion per signup month",
    table([
        { label: "Signup month", key: "month" },
        { label: "Signups", num: true, render: (r) => int(r.signups) },
        { label: "Converted", num: true, render: (r) => int(r.converted) },
        { label: "Conversion", num: true, render: (r) => pct(r.conversion_rate) },
    ], d.cohorts), { flush: true }),
    panel("Conversion by month and company size", "Hover a cell for n",
    heatTable(months, sizes, (m, s) => {
        const x = d.conversion_by_month_size.find((r) => r.month === m && r.company_size === s);
        return x && { value: x.conversion_rate, n: x.n };
    }, { rowLabel: "Month", fmt: pct0 }))) +
note(d.note);
}