import { panel, pct, int, grid, kpi, label, table, note, fixed } from "../ui.js";
import { divergingBars, hbars } from "../charts.js";

export default async function (view, ctx) {
  const d = await ctx.api("/behavior");
  view.innerHTML =
    grid("g2", kpi("Avg first-30-day usage: active accounts", fixed(d.avg_usage.active, 1)), kpi("Avg first-30-day usage: churned accounts", fixed(d.avg_usage.churned, 1))) +
    grid("g2", panel("Week-1 feature adoption vs churn", "Churn rate of adopters minus non-adopters (negative = adopters churn less)",
      divergingBars(d.feature_adoption.map((r) => ({ name: r.feature.replace(/_/g, " "), value: r.difference, text: `${r.difference > 0 ? "+" : ""}${(r.difference * 100).toFixed(1)} pts` })))),
      panel("Churn by first-30-day usage", "", hbars(d.by_engagement.map((r) => ({ name: `${r.key} events`, value: r.rate, text: pct(r.rate), sub: `${int(r.n)} accounts` })), { max: 1 }))) +
    panel("Feature detail", "Churn rate among accounts that did / did not use the feature in week 1",
      table([{ label: "Feature", render: (r) => label(r.feature) }, { label: "Adopters", num: true, render: (r) => int(r.adopters) },
        { label: "Adopter churn", num: true, render: (r) => pct(r.adopter_churn) }, { label: "Non-adopter churn", num: true, render: (r) => pct(r.non_adopter_churn) }], d.feature_adoption), { flush: true }) +
    `<div style="height:16px"></div>` +
    panel("Onboarding step completion vs churn", "Among converted accounts",
      table([{ label: "Step", render: (r) => label(r.step) }, { label: "Completed: n", num: true, render: (r) => int(r.completed_n) },
        { label: "Completed: churn", num: true, render: (r) => pct(r.completed_churn) }, { label: "Skipped: n", num: true, render: (r) => int(r.skipped_n) },
        { label: "Skipped: churn", num: true, render: (r) => pct(r.skipped_churn) }], d.onboarding_steps), { flush: true }) +
    note(d.note + " Differences show association, not proven cause.");
}