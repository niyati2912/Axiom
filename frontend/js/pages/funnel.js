import { panel, pct, int, grid, select, table, label, note } from "../ui.js";
import { hbars, heatTable } from "../charts.js";

export default async function (view, ctx) {
  const q = new URLSearchParams(ctx.args.join("/").replace(/^\?/, ""));
  const f = { channel: q.get("channel") || "", company_size: q.get("company_size") || "", cohort: q.get("cohort") || "" };
  const d = await ctx.api("/funnel", { params: f });
  ctx.setControls(
    select("f-channel", "Channel", [["", "All"], ...d.options.channels.map((c) => [c, c.replace(/_/g, " ")])], f.channel) +
    select("f-size", "Company size", [["", "All"], ...d.options.sizes.map((c) => [c, c])], f.company_size) +
    select("f-cohort", "Cohort", [["", "All"], ["pre_redesign", "Pre-redesign"], ["post_redesign", "Post-redesign"]], f.cohort));
  const go = () => { const p = new URLSearchParams(Object.entries({ channel: document.getElementById("f-channel").value, company_size: document.getElementById("f-size").value, cohort: document.getElementById("f-cohort").value }).filter(([, v]) => v)); location.hash = "#/workspace/funnel/" + (p.toString() ? "?" + p : ""); };
  ["f-channel", "f-size", "f-cohort"].forEach((id) => (document.getElementById(id).onchange = go));

  const steps = d.steps;
  const compare = (group, keys, title) => panel(title, "% of signups reaching each step",
    heatTable(steps.map((s) => s.step), keys, (step, k) => { const s = group[k]?.find((x) => x.step === step); return s?.pct_of_start != null ? { value: s.pct_of_start, n: s.n } : undefined; }, { rowLabel: "Step", fmt: (v) => `${(v * 100).toFixed(0)}%` }));
  const ld = d.largest_drop;
  view.innerHTML =
    (ld ? `<div class="callout" style="margin-bottom:16px"><h3>Largest drop-off: ${label(ld.step)}</h3><p>Only ${pct(ld.pct_of_previous)} of accounts that reached the previous step completed it (${int(ld.lost)} accounts lost).</p></div>` : "") +
    grid("g21", panel("Onboarding funnel", "Accounts completing each step (primary user per account)",
      hbars(steps.map((s) => ({ name: s.step.replace(/_/g, " "), value: s.n, text: int(s.n), sub: `${pct(s.pct_of_start)} of signups` })))),
      panel("Step-to-step conversion", "", table([{ label: "Step", render: (r) => label(r.step) }, { label: "From previous", num: true, render: (r) => pct(r.pct_of_previous) }, { label: "Lost", num: true, render: (r) => int(r.lost) }], steps), { flush: true })) +
    grid("g3", compare(d.by_channel, Object.keys(d.by_channel), "By channel"), compare(d.by_size, Object.keys(d.by_size), "By company size"), compare(d.by_cohort, Object.keys(d.by_cohort), "By redesign cohort")) +
    note("Cohort split uses the redesign date from the backend configuration (REDESIGN_DATE).");
}