// Flowing "events → signals → insights" wave field. Noisy on the left, converging into calm bands on the right.
const smooth = (a, b, x) => {
const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
return k * k * (3 - 2 * k);
};

export function startWaves(canvas, { lines = 8 } = {}) {
if (!canvas) return () => {};
const ctx = canvas.getContext("2d");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const t0 = performance.now();
let w = 0, h = 0, grad, raf = 0, visible = true;

function yAt(u, i, t) {
const calm = smooth(0.15, 0.85, u);
const k = lines > 1 ? (i / (lines - 1)) * 2 - 1 : 0;
const spread = (h * 0.3 * (1 - calm) + h * 0.09 * calm) * k;
const noise =
    (Math.sin(u * 23 + t * 1.3 + i * 1.7) * 0.5 +
    Math.sin(u * 41 - t * 0.9 + i * 2.3) * 0.35 +
    Math.sin(u * 67 + t * 1.9 + i) * 0.15) * (1 - calm) * h * 0.05;
const swell = Math.sin(u * 5 - t * 0.8 + i * 0.35) * h * 0.05 * (0.4 + 0.6 * calm);
return h * 0.55 + spread + noise + swell;
}

function draw(t) {
ctx.clearRect(0, 0, w, h);
ctx.lineWidth = 1.3;
ctx.strokeStyle = grad;
for (let i = 0; i < lines; i++) {
    const edge = Math.abs((i / Math.max(1, lines - 1)) * 2 - 1);
    ctx.globalAlpha = 0.25 + 0.55 * (1 - edge);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
    const y = yAt(x / w, i, t);
    if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
}
ctx.globalAlpha = 1;
// events travelling along the field, growing brighter as they become signals
for (let k = 0; k < 14; k++) {
    const i = k % 3 === 0 ? 0 : k % 3 === 1 ? Math.floor(lines / 2) : lines - 1;
    const u = (t * 0.05 + k / 14) % 1;
    const colour = u < 0.5 ? "255,122,217" : "120,210,255";
    ctx.fillStyle = `rgba(${colour},.9)`;
    ctx.shadowColor = `rgba(${colour},1)`;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(u * w, yAt(u, i, t), 1.5 + smooth(0.4, 1, u) * 2, 0, Math.PI * 2);
    ctx.fill();
}
ctx.shadowBlur = 0;
}

function resize() {
const r = canvas.getBoundingClientRect();
const dpr = Math.min(window.devicePixelRatio || 1, 2);
w = r.width;
h = r.height;
canvas.width = Math.round(w * dpr);
canvas.height = Math.round(h * dpr);
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
grad = ctx.createLinearGradient(0, 0, w, 0);
grad.addColorStop(0, "rgba(255,122,217,.55)");
grad.addColorStop(0.45, "rgba(79,140,255,.7)");
grad.addColorStop(1, "rgba(60,200,255,.85)");
if (reduce) draw(2);
}

const frame = (now) => {
if (visible && !document.hidden) draw((now - t0) / 1000);
raf = requestAnimationFrame(frame);
};

const ro = new ResizeObserver(resize);
ro.observe(canvas);
const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
io.observe(canvas);
resize();
if (!reduce) raf = requestAnimationFrame(frame);

return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
}