import { panel, pct, int, money, grid, kpi, select, table, badge, featureLabel, label, esc, fixed } from "../ui.js";
import { divergingBars } from "../charts.js";

export default async function (view, ctx) {
  if (ctx.args[0] && /^\d+$/.test(ctx.args[0])) return detail(view, ctx, ctx.args[0]);
  const q = new URLSearchParams(ctx.args.join("/").replace(/^\?/, ""));
  const f = { q: q.get("q") || "", status: q.get("status") || "", size: q.get("size") || "", channel: q.get("channel") || "", tier: q.get("tier") || "",
    sort: q.get("sort") || "account_id", order: q.get("order") || "asc", page: q.get("page") || "1" };
  const d = await ctx.api("/accounts", { params: { ...f, page_size: 25 } });
  ctx.setControls(
    `<label class="field">Account ID<input type="text" id="a-q" value="${esc(f.q)}" placeholder="e.g. 1042" style="width:110px"></label>` +
    select("a-status", "Status", [["", "All"], ["active", "Active"], ["churned", "Churned"], ["not_converted", "Not converted"]], f.status) +
    select("a-size", "Size", [["", "All"], ["solo", "solo"], ["team", "team"], ["enterprise", "enterprise"]], f.size) +
    select("a-channel", "Channel", [["", "All"], ...["organic", "paid_search", "referral", "content"].map((c) => [c, c.replace(/_/g, " ")])], f.channel) +
    select("a-tier", "Risk tier", [["", "All"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]], f.tier));
  const nav = (over) => { const p = { ...f, ...over }; location.hash = "#/workspace/accounts/?" + new URLSearchParams(Object.entries(p).filter(([k, v]) => v && !(k === "page" && v === "1"))); };
  const apply = () => nav({ q: document.getElementById("a-q").value.trim(), status: document.getElementById("a-status").value, size: document.getElementById("a-size").value, channel: document.getElementById("a-channel").value, tier: document.getElementById("a-tier").value, page: "1" });
  ["a-status", "a-size", "a-channel", "a-tier"].forEach((id) => (document.getElementById(id).onchange = apply));
  document.getElementById("a-q").onkeydown = (e) => e.key === "Enter" && apply();

  const cols = [{ label: "Account", sortKey: "account_id", render: (r) => r.account_id }, { label: "Signup", sortKey: "signup_date", key: "signup_date" }, { label: "Status", render: (r) => badge(r.status) },
    { label: "Size", key: "company_size" }, { label: "Channel", render: (r) => label(r.channel) }, { label: "Users", num: true, key: "user_count" }, { label: "MRR", num: true, sortKey: "mrr", render: (r) => money(r.mrr) },
    { label: "Wk-1 feat.", num: true, sortKey: "week1_feature_count", key: "week1_feature_count" }, { label: "Tickets", num: true, render: (r) => int(r.ticket_count) },
    { label: "Churn risk", num: true, sortKey: "risk", render: (r) => (r.risk == null ? "–" : `${pct(r.risk)} ${badge(r.tier)}`) }];
  const pages = Math.max(1, Math.ceil(d.total / d.page_size));
  view.innerHTML = panel(`${int(d.total)} accounts`, "Click a row to open the account", table(cols, d.rows, { onRowAttr: (r) => `class="clickable" data-id="${r.account_id}"`, sortKey: f.sort, sortDir: f.order }), { flush: true }) +
    `<div class="pager"><button class="btn secondary" id="prev" ${d.page <= 1 ? "disabled" : ""}>Previous</button><span>Page ${d.page} of ${pages}</span><button class="btn secondary" id="next" ${d.page >= pages ? "disabled" : ""}>Next</button></div>`;
  view.querySelectorAll("tr.clickable").forEach((tr) => (tr.onclick = () => (location.hash = `#/workspace/accounts/${tr.dataset.id}`)));
  view.querySelectorAll("th[data-sort]").forEach((th) => (th.onclick = () => nav({ sort: th.dataset.sort, order: f.sort === th.dataset.sort && f.order === "asc" ? "desc" : "asc", page: "1" })));
  document.getElementById("prev").onclick = () => nav({ page: String(d.page - 1) });
  document.getElementById("next").onclick = () => nav({ page: String(d.page + 1) });
}

async function detail(view, ctx, id) {
  const d = await ctx.api(`/accounts/${id}`);
  const a = d.account, p = d.prediction;
  document.getElementById("title").textContent = `Account ${a.account_id}`;
  const kv = (rows) => `<dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v ?? "–"}</dd>`).join("")}</dl>`;
  view.innerHTML = `<p><a href="#/workspace/accounts/">← All accounts</a></p>` +
    grid("g3", panel("Profile", "", kv([["Status", badge(a.status)], ["Signup", a.signup_date], ["Channel", label(a.channel)], ["Company size", esc(a.company_size)], ["Users", int(a.user_count)]])),
      panel("Subscription", "", kv([["Plan", esc(a.plan || "not converted")], ["Started", a.start_date], ["Ended", a.end_date], ["MRR", money(a.mrr)]])),
      panel("Early signals", "", kv([["Week-1 features", int(a.week1_feature_count)], ["Week-1 ticket", a.had_week1_ticket ? "Yes" : "No"], ["Total tickets", int(a.ticket_count)], ["SLA breaches", int(a.sla_breaches)]]))) +
    grid("g2", panel("Churn risk", p ? `Baseline ${pct(p.baseline_probability)}` : "", p ? `<div class="big">${pct(p.churn_probability)} ${badge(p.tier)}</div>${divergingBars(p.drivers.map((x) => ({ name: featureLabel(x.feature), value: x.effect, text: (x.effect > 0 ? "+" : "") + x.effect.toFixed(2) })))}` : `<div class="empty">No prediction (account has not converted or model unavailable).</div>`),
      panel("Onboarding journey", "", `<ul class="steps">${d.onboarding.map((s) => `<li><span class="dot ${s.completed ? "" : "off"}"></span>${label(s.step_name)}<span class="note" style="margin:0 0 0 auto">${s.completed ? esc(s.event_ts) : "not completed"}</span></li>`).join("")}</ul>`)) +
    grid("g3", panel("Billing events", "", table([{ label: "Event", render: (r) => label(r.event_type) }, { label: "Date", key: "event_ts" }], d.billing), { flush: true }),
      panel("Support tickets", "", table([{ label: "Date", key: "ticket_ts" }, { label: "Category", render: (r) => label(r.category) }, { label: "SLA breached", render: (r) => (r.sla_breached ? "Yes" : "No") }], d.tickets), { flush: true }),
      panel("Feature usage", "Events", table([{ label: "Feature", render: (r) => label(r.feature) }, { label: "Events", num: true, render: (r) => int(r.events) }], d.feature_usage), { flush: true })) +
    (d.exit_survey.length ? panel("Exit survey", "", d.exit_survey.map((e) => `<p><b>${label(e.reason_category)}</b> · rating ${e.satisfaction_rating}/5 · ${esc(e.response_ts)}<br>${esc(e.feedback_text)}</p>`).join("")) : "");
}