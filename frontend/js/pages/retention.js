import { panel, pct, grid, table, note } from "../ui.js";
import { chartBox, lineChart } from "../charts.js";

export default async function (view, ctx) {
  const d = await ctx.api("/retention");
  const H = d.horizons;

  view.innerHTML =
    grid("g2",
      panel("Retention by company size", "Share of converted accounts still paying N days after conversion",
        table([{ label: "Segment", render: (r) => r.key },
          ...H.map((h) => ({ label: `${h} days`, num: true, render: (r) => pct(r[`retained_${h}`]) }))], d.by_size), { flush: true }),
      panel("Retention across signup cohorts", "One line per horizon", chartBox("c-ret", 260))) +
    note(d.note) +
    `<p class="subnav"><a href="#/workspace/cohorts">Cohort heat map →</a> · <a href="#/workspace/survival">Survival curves →</a></p>`;

  const cats = d.cohorts.map((c) => c.month);
  lineChart(document.getElementById("c-ret"),
    H.map((h) => ({
      name: `${h} days`,
      points: d.cohorts.map((c, i) => ({ x: i, y: c[`retained_${h}`] })).filter((p) => p.y != null),
    })),
    { categories: cats, yFmt: (v) => `${Math.round(v * 100)}%`, yMin: 0, yMax: 1, height: 260 });
}