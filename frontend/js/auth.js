import { startWaves } from "./waves.js";

const USERS = "axiom-users";
const SESSION = "axiom-session";
const $ = (id) => document.getElementById(id);

const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

export const getSession = () => read(SESSION, null);
export function signOut() { try { localStorage.removeItem(SESSION); } catch { /* ignore */ } }

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(12)));

async function hashPassword(password, salt) {
const enc = new TextEncoder();
const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits(
{ name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
return hex(bits);
}

const COPY = {
signin: {
kicker: "WELCOME BACK", title: "Sign in to Axiom", sub: "Pick up your investigation where you left it.",
cta: "Sign in", alt: `New here? <a href="#/signup">Create an account</a>`,
},
signup: {
kicker: "GET STARTED", title: "Create your account", sub: "Open the workspace and start investigating.",
cta: "Create account", alt: `Already have an account? <a href="#/signin">Sign in</a>`,
},
};

let stopWaves = null;
export function stopAuth() { stopWaves?.(); stopWaves = null; }

export function mountAuth(mode) {
const c = COPY[mode];
$("auKicker").textContent = c.kicker;
$("auTitle").textContent = c.title;
$("auSub").textContent = c.sub;
$("auSubmit").textContent = c.cta;
$("auSwitch").innerHTML = c.alt;
$("auNameRow").hidden = mode !== "signup";
$("auPass").autocomplete = mode === "signup" ? "new-password" : "current-password";
$("auError").hidden = true;

const fail = (msg) => { $("auError").textContent = msg; $("auError").hidden = false; };

$("auForm").onsubmit = async (e) => {
e.preventDefault();
$("auError").hidden = true;
const email = $("auEmail").value.trim().toLowerCase();
const password = $("auPass").value;
const name = $("auName").value.trim();

if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.");
if (password.length < 8) return fail("Password must be at least 8 characters.");
if (!window.crypto?.subtle) return fail("Sign-in needs localhost or HTTPS. Use the demo workspace instead.");

const users = read(USERS, {});
if (mode === "signup") {
    if (!name) return fail("Tell us your name.");
    if (users[email]) return fail("An account with this email already exists in this browser. Sign in instead.");
    const salt = newSalt();
    users[email] = { name, salt, hash: await hashPassword(password, salt) };
    write(USERS, users);
    write(SESSION, { name, email });
} else {
    const u = users[email];
    if (!u || u.hash !== (await hashPassword(password, u.salt))) return fail("Email or password is incorrect.");
    write(SESSION, { name: u.name, email });
}
location.hash = "#/workspace/overview";
};

$("auGuest").onclick = () => {
write(SESSION, { name: "Demo analyst", email: "", guest: true });
location.hash = "#/workspace/overview";
};

if (!stopWaves) stopWaves = startWaves($("auWaves"), { lines: 9 });
}