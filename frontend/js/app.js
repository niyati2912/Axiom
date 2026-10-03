import { api, clearApiCache } from "./api.js";
import { esc } from "./ui.js";
import { getSession, signOut, mountAuth, stopAuth } from "./auth.js";
import { initLanding, stopLanding } from "./landing.js";

// Sidebar items (kept to eight on purpose).
const ROUTES = [
{ group: "Workspace", path: "overview", name: "Overview", mod: "overview",
sub: "What is happening to the product right now." },
{ group: "Analyze", path: "acquisition", name: "Acquisition", mod: "acquisition",
sub: "Which channels bring in users who activate, convert and stay." },
{ group: "Analyze", path: "funnel", name: "Onboarding", mod: "funnel",
sub: "Where accounts drop out between signup and paying." },
{ group: "Analyze", path: "cohorts", name: "Cohorts", mod: "cohorts",
sub: "When accounts joined versus how they behaved afterwards." },
{ group: "Analyze", path: "retention", name: "Retention", mod: "retention",
sub: "How long paying accounts stay, by segment and over time." },
{ group: "Analyze", path: "survival", name: "Survival", mod: "survival",
sub: "Probability an account is still subscribed after N days." },
{ group: "Predict", path: "predictions", name: "Churn Intelligence", mod: "predictions",
sub: "Which active accounts are at elevated risk, and why." },
{ group: "Predict", path: "explainability", name: "Model Explainability", mod: "explainability",
sub: "What the churn model learned, explained with SHAP." },
];

// Reachable from links inside pages, but not in the sidebar.
const HIDDEN = [
{ path: "users", name: "Acquisition mix", parent: "acquisition", mod: "users", sub: "Who is signing up, converting and engaging." },
{ path: "churn", name: "Who is churning", parent: "predictions", mod: "churn", sub: "Where churn is happening and how it differs." },
{ path: "behavior", name: "Behavior", parent: "predictions", mod: "behavior", sub: "Actions that separate retained accounts from churned ones." },
{ path: "feedback", name: "Feedback", parent: "predictions", mod: "feedback", sub: "What departing customers say versus what they did." },
{ path: "accounts", name: "Accounts", parent: "", mod: "accounts", sub: "Search customers and inspect their complete history." },
];

const ALL = [...ROUTES, ...HIDDEN];
const $ = (id) => document.getElementById(id);
let token = 0;

function show(which) {
for (const id of ["landing", "auth", "application"]) $(id).hidden = id !== which;
document.body.classList.toggle("in-app", which === "application");
}

function buildNav(active) {
let last = "", html = "";
for (const r of ROUTES) {
if (r.group !== last) { html += `<div class="nav-section">${esc(r.group)}</div>`; last = r.group; }
html += `<a href="#/workspace/${r.path}" class="${r.path === active ? "active" : ""}">
    <span class="nav-indicator"></span><span>${esc(r.name)}</span></a>`;
}
$("nav").innerHTML = html;
}

function updateUser() {
const s = getSession();
$("userName").textContent = s?.name || "";
$("userAvatar").textContent = (s?.name || "?").trim().charAt(0).toUpperCase();
}

async function renderWorkspace(path, rest = []) {
const route = ALL.find((r) => r.path === path) || ROUTES[0];
const my = ++token;

show("application");
updateUser();
buildNav(route.parent ?? route.path);

$("title").textContent = route.name;
$("pageTitle").textContent = route.name;
$("subtitle").textContent = route.sub;
$("controls").innerHTML = "";

const view = $("view");
view.innerHTML = `<div class="loading-screen"><div class="loading-orbit"></div><span>Reading product signals…</span></div>`;

const ctx = {
args: rest,
api,
setControls: (html) => { if (my === token) $("controls").innerHTML = html; },
alive: () => my === token,
navigate: (hash) => { location.hash = hash; },
};

try {
const mod = await import(`./pages/${route.mod}.js`);
await mod.default(view, ctx);
} catch (error) {
if (my === token) {
    view.innerHTML = `<div class="error-card"><div class="error-icon">!</div><div>
    <strong>Something interrupted this view.</strong><p>${esc(error.message)}</p>
    <button class="btn" onclick="location.reload()">Reload Axiom</button></div></div>`;
}
console.error(error);
}
}

async function render() {
const parts = (location.hash || "#/").replace(/^#\/?/, "").split("/");
const head = parts[0];

if (!head) { stopAuth(); show("landing"); scrollTo(0, 0); initLanding(); return; }
if (head === "signin" || head === "signup") { stopLanding(); show("auth"); scrollTo(0, 0); mountAuth(head); return; }

if (head === "workspace") parts.shift();
if (!getSession()) { location.hash = "#/signin"; return; }

stopLanding();
stopAuth();
await renderWorkspace(parts[0] || "overview", parts.slice(1));
}

$("refresh").addEventListener("click", async () => {
const b = $("refresh");
b.disabled = true;
b.innerHTML = `<span class="spin">↻</span> Refreshing…`;
try { await api("/refresh", { method: "POST" }); } catch (e) { console.warn(e); }
clearApiCache();
b.disabled = false;
b.innerHTML = `<span>↻</span> Refresh data`;
await render();
});

$("find").addEventListener("submit", (e) => {
e.preventDefault();
const v = $("findInput").value.trim();
if (/^\d+$/.test(v)) { location.hash = `#/workspace/accounts/${v}`; $("findInput").value = ""; }
});

$("signout").addEventListener("click", () => { signOut(); location.hash = "#/"; });

window.addEventListener("hashchange", render);
render();