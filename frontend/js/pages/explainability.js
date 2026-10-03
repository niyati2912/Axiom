import { panel, pct, int, grid, kpi, table, featureLabel, note, fixed, esc } from "../ui.js";
import { chartBox, lineChart, hbars } from "../charts.js";

export default async function (view, ctx) {
  const d = await ctx.api("/explainability");
  const m = d.metrics;
  const dep = Object.entries(d.dependence).filter(([f]) => f === "week1_feature_count" || f === "had_week1_ticket" || Object.keys(d.dependence).length <= 3);
  view.innerHTML =
    (m ? grid("g4", kpi("ROC-AUC", fixed(m.roc_auc, 3), `${int(m.n_test)} held-out accounts`), kpi("Accuracy", pct(m.accuracy)), kpi("Precision (churn)", pct(m.precision)), kpi("Recall (churn)", pct(m.recall), `F1 ${fixed(m.f1, 2)}`))
      : `<div class="empty">Not enough labeled data to compute metrics.</div>`) +
    grid("g2", panel("Global feature importance", "Mean |SHAP| in log-odds across all converted accounts",
      hbars(d.features.map((f) => ({ name: featureLabel(f.feature), value: f.importance, text: f.importance.toFixed(3) })))),
      m ? panel("ROC curve", "Held-out test set", chartBox("c-roc", 260)) : "") +
    panel("Effect by feature value", "Average SHAP contribution when the feature takes each value (positive raises churn risk)",
      `<div class="grid g3">${dep.map(([f, rows]) => `<div><b>${esc(featureLabel(f))}</b>${table([{ label: "Value", num: true, render: (r) => r.value }, { label: "n", num: true, render: (r) => int(r.n) }, { label: "Mean effect", num: true, render: (r) => (r.mean_effect > 0 ? "+" : "") + r.mean_effect.toFixed(3) }], rows)}</div>`).join("")}</div>`) +
    (m ? `<div style="height:16px"></div>` + grid("g2", panel("Confusion matrix", "Threshold 0.5, held-out set",
      table([{ label: "" , key: "l" }, { label: "Predicted retained", num: true, key: "a" }, { label: "Predicted churn", num: true, key: "b" }],
        [{ l: "Actually retained", a: int(m.confusion.tn), b: int(m.confusion.fp) }, { l: "Actually churned", a: int(m.confusion.fn), b: int(m.confusion.tp) }]), { flush: true }),
      panel("Model", "XGBoost classifier loaded from the model file", `<p class="note">Baseline churn probability: ${pct(d.baseline_probability)} across ${int(d.n_accounts)} accounts. ${esc(d.metrics_note || "")}</p>`)) : "") +
    note("SHAP values describe how the model uses each feature, not causal effects.");
  if (m) lineChart(document.getElementById("c-roc"), [{ name: "ROC", points: m.roc.map((p) => ({ x: p.x, y: p.y })) }, { name: "Chance", color: "#c8ccd4", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
    { yMin: 0, yMax: 1, yFmt: (v) => v.toFixed(1), xFmt: (v) => v.toFixed(1), xLabel: "False positive rate", height: 260 });
}