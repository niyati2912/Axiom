const $ = (id) => document.getElementById(id);

const sleep = (ms) =>
new Promise((resolve) => setTimeout(resolve, ms));

let stopped = false;
let cleanups = [];


/* ============================================================
AXIOM E-COMMERCE LANDING
No fake backend dependency.
The landing page demonstrates the product concept.
============================================================ */


/* ------------------------------------------------------------
AXIOM SIGNAL DATA
------------------------------------------------------------ */

const signals = [

{
query: "black jeans",
product: "Black denim",
event: "search",
score: 72
},

{
query: "black jeans",
product: "Black denim",
event: "viewed product",
score: 78
},

{
query: "black jeans",
product: "Black denim",
event: "added to cart",
score: 86
},

{
query: "black jeans",
product: "Black denim",
event: "checked price",
score: 91
},

{
query: "black jeans",
product: "Black denim",
event: "hesitation detected",
score: 94
}

];


/* ------------------------------------------------------------
UPDATE OLD LANDING COPY
------------------------------------------------------------ */

function updateHeroCopy() {

const pill = document.querySelector(".lp-pill");

if (pill) {

pill.innerHTML = `
    <span class="live-dot"></span>
    Autonomous revenue intelligence
`;

}


const heroTitle = document.querySelector(".lp-hero h1");

if (heroTitle) {

heroTitle.innerHTML = `
    Your store is
    <em>talking.</em>
    Axiom listens.
`;

}


const heroDescription =
document.querySelector(".lp-hero p");

if (heroDescription) {

heroDescription.textContent =
    "Axiom watches the tiny signals behind every shopper — " +
    "searches, product views, watchlists, cart hesitation " +
    "and repeated price checks — then turns those signals " +
    "into autonomous revenue recovery.";

}


const flow =
document.querySelector(".lp-flow");

if (flow) {

flow.innerHTML = `
    <span>behavior</span>
    <i></i>
    <span>intent</span>
    <i></i>
    <span>recovery</span>
`;

}

}


/* ------------------------------------------------------------
MINI DASHBOARD
------------------------------------------------------------ */

function updateMiniDashboard() {

const accounts =
$("lpAccounts");

const conversion =
$("lpConv");

const churn =
$("lpChurn");

if (accounts) {
accounts.textContent = "1,284";
}

if (conversion) {
conversion.textContent = "91%";
}

if (churn) {
churn.textContent = "78%";
}


const signal =
$("lpSignal");

if (signal) {

signal.textContent =
    "Shopper #4821 repeatedly checked price after adding ₹4,398 to cart.";

}


/*
* Replace the old B2B chart language
* with an intent/recovery signal.
*/

const miniLabels =
document.querySelectorAll(".lp-mini small");

if (miniLabels.length >= 3) {

miniLabels[0].textContent =
    "ACTIVE SESSIONS";

miniLabels[1].textContent =
    "PURCHASE INTENT";

miniLabels[2].textContent =
    "REVENUE AT RISK";

}

}


/* ------------------------------------------------------------
LIVE SIGNAL ANIMATION
------------------------------------------------------------ */

async function animateSignal() {

const signalElement =
$("lpSignal");

if (!signalElement) {
return;
}

let index = 0;

while (!stopped) {

const item =
    signals[index];

signalElement.innerHTML = `
    <strong style="
    display:block;
    margin-bottom:5px;
    font-size:12px;
    color:#171714;
    ">
    ${item.event}
    </strong>

    <span style="
    color:#77776f;
    font-size:11px;
    ">
    ${item.product}
    · intent ${item.score}%
    </span>
`;

index++;

if (index >= signals.length) {
    index = 0;
}

await sleep(1900);

}

}


/* ------------------------------------------------------------
STORY SECTION
------------------------------------------------------------ */

function updateStory() {

const steps =
[...document.querySelectorAll(".lp-step")];

const labels = [

{
    title: "WATCH",
    question: "What is the shopper doing?"
},

{
    title: "UNDERSTAND",
    question: "What does that behavior mean?"
},

{
    title: "SCORE",
    question: "How likely are they to buy?"
},

{
    title: "DETECT",
    question: "Is there a recovery opportunity?"
},

{
    title: "ACT",
    question: "What should Axiom trigger?"
}

];


steps.forEach((step, index) => {

const data =
    labels[index];

if (!data) {
    return;
}


const heading =
    step.querySelector("h3");

const bold =
    step.querySelector("b");

const number =
    step.querySelector("span");


if (heading) {
    heading.textContent =
    data.title;
}

if (bold) {
    bold.textContent =
    data.question;
}

if (number) {
    number.textContent =
    String(index + 1).padStart(2, "0");
}

});


const stageLabel =
$("lpStageLabel");

if (stageLabel) {

stageLabel.textContent =
    "BEHAVIOR → INTENT → RECOVERY";

}


/*
* Existing scenes are kept.
* We replace their contents with Axiom's
* actual e-commerce mental model.
*/

const scenes = {

scene0: `
    <div class="axiom-scene-card">

    <span class="lp-kicker">
        LIVE BEHAVIOR
    </span>

    <h3>
        Shopper #4821
    </h3>

    <div class="axiom-event-row">
        <span>22:41:08</span>
        <strong>searched</strong>
        <b>"black jeans"</b>
    </div>

    <div class="axiom-event-row">
        <span>22:41:31</span>
        <strong>viewed product</strong>
        <b>4×</b>
    </div>

    <div class="axiom-event-row">
        <span>22:42:04</span>
        <strong>added to cart</strong>
        <b>₹4,398</b>
    </div>

    </div>
`,

scene1: `
    <div class="axiom-scene-card">

    <span class="lp-kicker">
        BEHAVIOR PATTERN
    </span>

    <h3>
        Hesitation loop detected.
    </h3>

    <p>
        The shopper repeatedly revisits the product
        and checks the price without converting.
    </p>

    <div class="axiom-loop">
        VIEW
        <span>→</span>
        CART
        <span>→</span>
        PRICE
        <span>→</span>
        VIEW
    </div>

    </div>
`,

scene2: `
    <div class="axiom-scene-card">

    <span class="lp-kicker">
        PURCHASE INTENT
    </span>

    <div class="axiom-big-number">
        91<span>%</span>
    </div>

    <div class="axiom-progress">
        <i style="width:91%"></i>
    </div>

    <p>
        High-intent shopper. Strong behavioral
        evidence of purchase consideration.
    </p>

    </div>
`,

scene3: `
    <div class="axiom-scene-card">

    <span class="lp-kicker">
        MARKET SIGNAL
    </span>

    <h3>
        Price changed.
    </h3>

    <div class="axiom-price-change">

        <span>
        ₹4,398
        </span>

        <b>
        →
        </b>

        <strong>
        ₹3,899
        </strong>

    </div>

    <p>
        Product price dropped while this shopper
        remains in a high-intent state.
    </p>

    </div>
`,

scene4: `
    <div class="axiom-scene-card">

    <span class="lp-kicker">
        AXIOM ACTION
    </span>

    <h3>
        Recovery opportunity.
    </h3>

    <div class="axiom-action">

        <strong>
        PRICE DROP
        </strong>

        <span>
        →
        </span>

        <b>
        TARGETED NUDGE
        </b>

    </div>

    <p>
        Axiom can trigger the intervention automatically.
    </p>

    </div>
`

};


Object.entries(scenes).forEach(
([id, html]) => {

    const element =
    $(id);

    if (element) {
    element.innerHTML =
        html;
    }

}
);

}


/* ------------------------------------------------------------
INVESTIGATION BOARD
------------------------------------------------------------ */

function updateInvestigationBoard() {

const question =
document.querySelector(".lp-board-q h3");

if (question) {

question.textContent =
    "Which shoppers are about to buy — but haven't?";

}


const nodes =
[...document.querySelectorAll(".lp-node")];

const data = [

{
    tag: "BEHAVIOR",
    title: "Watch the micro-behaviors",
    text: "Searches, views, revisits, watchlists and price checks."
},

{
    tag: "INTENT",
    title: "Calculate purchase intent",
    text: "Combine behavioral signals into a live intent probability."
},

{
    tag: "RISK",
    title: "Detect hesitation",
    text: "Identify shoppers repeatedly approaching checkout without converting."
},

{
    tag: "MARKET",
    title: "Watch price and inventory",
    text: "React when external product conditions change."
},

{
    tag: "OPPORTUNITY",
    title: "Find recoverable revenue",
    text: "Connect high intent with a timely market event."
},

{
    tag: "ACTION",
    title: "Trigger recovery",
    text: "Nudge, webhook or campaign — automatically."
}

];


nodes.forEach((node, index) => {

const item =
    data[index];

if (!item) {
    return;
}


const tag =
    node.querySelector(".lp-tag");

const heading =
    node.querySelector("h4");

const paragraph =
    node.querySelector("p");


if (tag) {
    tag.textContent =
    item.tag;
}

if (heading) {
    heading.textContent =
    item.title;
}

if (paragraph) {
    paragraph.textContent =
    item.text;
}

});

}


/* ------------------------------------------------------------
CSS FOR NEW JS-GENERATED SCENES
------------------------------------------------------------ */

function injectSceneStyles() {

if (
document.getElementById(
    "axiomLandingSceneStyles"
)
) {
return;
}


const style =
document.createElement("style");

style.id =
"axiomLandingSceneStyles";


style.textContent = `

.axiom-scene-card {
    width:100%;
    padding:28px;
    border:1px solid #d9d8d0;
    border-radius:20px;
    background:#fbfaf6;
    color:#171714;
}

.axiom-scene-card h3 {
    margin:10px 0 18px;
    font-size:28px;
    letter-spacing:-.045em;
}

.axiom-scene-card p {
    color:#77776f;
    line-height:1.65;
    font-size:13px;
}

.axiom-event-row {
    display:grid;
    grid-template-columns:70px 1fr auto;
    gap:12px;
    align-items:center;
    padding:13px 0;
    border-top:1px solid #e9e8e1;
    font-size:11px;
}

.axiom-event-row span {
    color:#999990;
    font-family:"DM Mono",monospace;
    font-size:9px;
}

.axiom-event-row strong {
    font-weight:600;
}

.axiom-event-row b {
    font-family:"DM Mono",monospace;
    font-size:10px;
}

.axiom-loop {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:8px;
    margin-top:25px;
    padding:18px;
    border:1px dashed #d2d1c9;
    border-radius:14px;
    background:#f4f3ee;
    font-family:"DM Mono",monospace;
    font-size:9px;
    letter-spacing:.05em;
}

.axiom-loop span {
    color:#5266f5;
    font-size:16px;
}

.axiom-big-number {
    margin:25px 0 18px;
    font-family:Inter,sans-serif;
    font-size:76px;
    font-weight:700;
    letter-spacing:-.08em;
}

.axiom-big-number span {
    margin-left:5px;
    color:#77776f;
    font-size:24px;
    letter-spacing:0;
}

.axiom-progress {
    width:100%;
    height:8px;
    overflow:hidden;
    border-radius:99px;
    background:#e5e4dc;
}

.axiom-progress i {
    display:block;
    height:100%;
    border-radius:99px;
    background:#5266f5;
}

.axiom-price-change {
    display:flex;
    align-items:center;
    gap:16px;
    margin:25px 0;
    font-family:"DM Mono",monospace;
}

.axiom-price-change span {
    color:#999990;
    text-decoration:line-through;
}

.axiom-price-change b {
    color:#999990;
}

.axiom-price-change strong {
    color:#23865b;
    font-size:20px;
}

.axiom-action {
    display:flex;
    align-items:center;
    gap:12px;
    margin:25px 0;
    padding:16px;
    border-radius:13px;
    background:#e8ebff;
}

.axiom-action strong {
    color:#5266f5;
    font-family:"DM Mono",monospace;
    font-size:10px;
}

.axiom-action b {
    font-size:13px;
}

`;


document.head.appendChild(style);

}


/* ------------------------------------------------------------
NAV SCROLL
------------------------------------------------------------ */

function setupNav() {

const nav =
$("lpNav");

if (!nav) {
return;
}


const onScroll = () => {

nav.classList.toggle(
    "stuck",
    window.scrollY > 20
);

};


window.addEventListener(
"scroll",
onScroll,
{ passive: true }
);

onScroll();


cleanups.push(() => {

window.removeEventListener(
    "scroll",
    onScroll
);

});

}


/* ------------------------------------------------------------
STORY INTERACTION
------------------------------------------------------------ */

function setupStory() {

const steps =
[...document.querySelectorAll(".lp-step")];

const scenes =
[...document.querySelectorAll(".lp-scene")];

if (!steps.length) {
return;
}


const activate =
(index) => {

    steps.forEach(
    (step, i) => {

        step.classList.toggle(
        "on",
        i === index
        );

    }
    );


    scenes.forEach(
    (scene, i) => {

        scene.classList.toggle(
        "on",
        i === index
        );

    }
    );

};


steps.forEach(
(step, index) => {

    step.addEventListener(
    "mouseenter",
    () => activate(index)
    );

    step.addEventListener(
    "click",
    () => activate(index)
    );

}
);


activate(0);

}


/* ------------------------------------------------------------
PUBLIC INIT
------------------------------------------------------------ */

export async function initLanding() {

stopped = false;

updateHeroCopy();

updateMiniDashboard();

updateStory();

updateInvestigationBoard();

injectSceneStyles();

setupNav();

setupStory();

/*
* Start animation without depending on
* the old B2B analytics API.
*/

animateSignal();

}


/* ------------------------------------------------------------
PUBLIC STOP
------------------------------------------------------------ */

export function stopLanding() {

stopped = true;

cleanups.forEach(
(cleanup) => cleanup()
);

cleanups = [];

}