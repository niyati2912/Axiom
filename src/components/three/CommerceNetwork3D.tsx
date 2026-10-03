"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface NetworkNodeData {
  id: string;
  code: string;
  label: string;
  sublabel: string;
  metric: string;
  category: "shopper" | "behavior" | "intent" | "market" | "recovery";
  position: [number, number, number];
  color: string;
}

const NETWORK_NODES: NetworkNodeData[] = [
  {
    id: "shopper",
    code: "NODE 01",
    label: "SHOPPER #4821",
    sublabel: "Active Session · 4th Visit",
    metric: "Aarav M. · Mumbai",
    category: "shopper",
    position: [-3.2, 0.55, 0.4],
    color: "#141413",
  },
  {
    id: "search",
    code: "NODE 02",
    label: "SEARCH",
    sublabel: '"black jeans"',
    metric: "22:41:08 · Query Match",
    category: "behavior",
    position: [-1.5, 1.85, -0.5],
    color: "#3B52F6",
  },
  {
    id: "product",
    code: "NODE 03",
    label: "PRODUCT",
    sublabel: "Black Denim · 4× Revisit",
    metric: "184 Watchlist · 61 Carts",
    category: "behavior",
    position: [-0.4, 0.5, 0.7],
    color: "#3B52F6",
  },
  {
    id: "watchlist",
    code: "NODE 04",
    label: "WATCHLIST",
    sublabel: "Saved + Price Tracked",
    metric: "3× Price Check",
    category: "behavior",
    position: [-1.75, -1.05, -0.3],
    color: "#6E6E68",
  },
  {
    id: "cart",
    code: "NODE 05",
    label: "CART",
    sublabel: "Added ₹4,398 → Left Cart",
    metric: "Hesitation Loop",
    category: "behavior",
    position: [0.3, -1.0, 0.5],
    color: "#C88A1E",
  },
  {
    id: "hesitation",
    code: "NODE 06",
    label: "HESITATION",
    sublabel: "Returned Session · Stalled",
    metric: "78% Drop-Off Risk",
    category: "intent",
    position: [1.3, 1.5, -0.4],
    color: "#D6453A",
  },
  {
    id: "intent",
    code: "NODE 07",
    label: "INTENT 91%",
    sublabel: "94% Confidence Score",
    metric: "+18 View · +27 Cart · +21 Price",
    category: "intent",
    position: [1.55, 0.05, 0.9],
    color: "#3B52F6",
  },
  {
    id: "market",
    code: "NODE 08",
    label: "MARKET EVENT",
    sublabel: "₹4,398 → ₹3,899 (-11.3%)",
    metric: "Price Drop Detected",
    category: "market",
    position: [2.75, -1.15, 0.1],
    color: "#3B52F6",
  },
  {
    id: "recovery",
    code: "NODE 09",
    label: "RECOVERY",
    sublabel: "In-App Nudge + Webhook",
    metric: "DELIVERED · ₹3,899",
    category: "recovery",
    position: [3.35, 0.55, 0.5],
    color: "#1F8A5C",
  },
];

const NETWORK_EDGES: [string, string][] = [
  ["shopper", "search"],
  ["shopper", "product"],
  ["shopper", "watchlist"],
  ["search", "product"],
  ["product", "cart"],
  ["watchlist", "cart"],
  ["product", "hesitation"],
  ["cart", "intent"],
  ["hesitation", "intent"],
  ["intent", "market"],
  ["market", "recovery"],
  ["intent", "recovery"],
];

interface ProjectedCoords {
  id: string;
  x: number;
  y: number;
  z: number;
  visible: boolean;
}

interface CommerceNetwork3DProps {
  activeEventLabel?: string;
  intentScorePct?: number;
  compact?: boolean;
  onSelectNode?: (node: NetworkNodeData) => void;
}

export default function CommerceNetwork3D({
  activeEventLabel = "HESITATION LOOP DETECTED",
  intentScorePct = 91,
  compact = false,
  onSelectNode,
}: CommerceNetwork3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [projected, setProjected] = useState<ProjectedCoords[]>([]);
  const [selectedId, setSelectedId] = useState<string>("intent");
  const [pulseStep, setPulseStep] = useState<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseStep((prev) => (prev + 1) % NETWORK_NODES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 7.6);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Subtle architectural orbital rings in background
    const ringGeo1 = new THREE.RingGeometry(2.35, 2.37, 96);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xd5d5cc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI * 0.34;
    ring1.rotation.y = Math.PI * 0.12;
    rootGroup.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(3.45, 3.465, 112);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x3b52f6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI * 0.28;
    ring2.rotation.z = Math.PI * 0.18;
    rootGroup.add(ring2);

    // Create 3D meshes for each node
    const nodeMeshes: Record<string, THREE.Group> = {};
    const basePositions: Record<string, THREE.Vector3> = {};

    NETWORK_NODES.forEach((node) => {
      const group = new THREE.Group();
      const pos = new THREE.Vector3(...node.position);
      group.position.copy(pos);
      basePositions[node.id] = pos.clone();

      const isCore = node.id === "intent" || node.id === "recovery" || node.id === "shopper";
      const radius = isCore ? 0.14 : 0.095;

      const coreGeo = new THREE.SphereGeometry(radius, 24, 24);
      const coreMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      group.add(coreMesh);

      const haloGeo = new THREE.RingGeometry(radius * 1.45, radius * 1.85, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isCore ? 0.45 : 0.25,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      group.add(haloMesh);

      rootGroup.add(group);
      nodeMeshes[node.id] = group;
    });

    // Create curved 3D Bezier connections and signal particles traveling along them
    interface EdgeVisual {
      from: string;
      to: string;
      curve: THREE.CubicBezierCurve3;
      line: THREE.Line;
      packet: THREE.Mesh;
      speed: number;
      offset: number;
    }

    const edgeVisuals: EdgeVisual[] = [];
    const packetGeo = new THREE.SphereGeometry(0.055, 14, 14);

    NETWORK_EDGES.forEach(([fromId, toId], idx) => {
      const p1 = basePositions[fromId];
      const p2 = basePositions[toId];
      if (!p1 || !p2) return;

      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      mid.z += (idx % 2 === 0 ? 0.35 : -0.25);
      mid.y += (idx % 3 === 0 ? 0.2 : -0.15);

      const curve = new THREE.CubicBezierCurve3(p1, mid, mid.clone(), p2);
      const points = curve.getPoints(44);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const isHighlightEdge =
        toId === "intent" || toId === "recovery" || fromId === "intent";
      const lineMat = new THREE.LineBasicMaterial({
        color: isHighlightEdge ? 0x3b52f6 : 0xb8b8ae,
        transparent: true,
        opacity: isHighlightEdge ? 0.55 : 0.4,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      rootGroup.add(line);

      const packetColor =
        toId === "recovery"
          ? 0x1f8a5c
          : toId === "hesitation"
          ? 0xd6453a
          : 0x3b52f6;
      const packetMat = new THREE.MeshBasicMaterial({ color: packetColor });
      const packet = new THREE.Mesh(packetGeo, packetMat);
      rootGroup.add(packet);

      edgeVisuals.push({
        from: fromId,
        to: toId,
        curve,
        line,
        packet,
        speed: 0.24 + (idx % 4) * 0.05,
        offset: (idx * 0.17) % 1,
      });
    });

    // Subtle ambient floating dust particles in 3D space
    const dustCount = 55;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 9;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x8d8d84,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    rootGroup.add(dustPoints);

    let animFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Gentle camera/group parallax + orbital breathing
      const targetRotY = mouseRef.current.x * 0.18 + Math.sin(t * 0.25) * 0.08;
      const targetRotX = -mouseRef.current.y * 0.12 + Math.cos(t * 0.2) * 0.04;
      rootGroup.rotation.y += (targetRotY - rootGroup.rotation.y) * 0.05;
      rootGroup.rotation.x += (targetRotX - rootGroup.rotation.x) * 0.05;

      ring1.rotation.z = t * 0.06;
      ring2.rotation.y = -t * 0.05;

      // Oscillate nodes slightly and update edge endpoints
      NETWORK_NODES.forEach((node, idx) => {
        const meshGroup = nodeMeshes[node.id];
        const base = basePositions[node.id];
        if (!meshGroup || !base) return;
        meshGroup.position.y = base.y + Math.sin(t * 1.1 + idx * 0.9) * 0.07;
        meshGroup.position.x = base.x + Math.cos(t * 0.8 + idx * 1.1) * 0.04;
        meshGroup.children[1]?.lookAt(camera.position);
      });

      // Move signal packets along curves
      edgeVisuals.forEach((ev) => {
        const pStart = nodeMeshes[ev.from]?.position;
        const pEnd = nodeMeshes[ev.to]?.position;
        if (pStart && pEnd) {
          ev.curve.v0.copy(pStart);
          ev.curve.v3.copy(pEnd);
        }
        const progress = (t * ev.speed + ev.offset) % 1;
        const pt = ev.curve.getPoint(progress);
        ev.packet.position.copy(pt);
      });

      if (renderer) {
        renderer.render(scene, camera);
      }

      // Project 3D node positions to 2D overlay coordinates
      const cWidth = container.clientWidth || width;
      const cHeight = container.clientHeight || height;
      const nextProj: ProjectedCoords[] = NETWORK_NODES.map((node) => {
        const meshGroup = nodeMeshes[node.id];
        const worldPos = new THREE.Vector3();
        if (meshGroup) {
          meshGroup.getWorldPosition(worldPos);
        }
        worldPos.project(camera);
        return {
          id: node.id,
          x: (worldPos.x * 0.5 + 0.5) * cWidth,
          y: (-worldPos.y * 0.5 + 0.5) * cHeight,
          z: worldPos.z,
          visible: worldPos.z < 1,
        };
      });
      setProjected(nextProj);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameId);
      renderer?.dispose();
    };
  }, []);

  const selectedNode =
    NETWORK_NODES.find((n) => n.id === selectedId) || NETWORK_NODES[6];
  const activePulseNode = NETWORK_NODES[pulseStep];

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseRef.current = {
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
        };
      }}
      onMouseLeave={() => {
        mouseRef.current = { x: 0, y: 0 };
      }}
      className={`relative w-full overflow-hidden rounded-2xl border border-axiom-line bg-gradient-to-b from-[#FBFBF8] via-[#F6F6F0] to-[#EFEFE7] select-none ${
        compact ? "h-[380px]" : "h-[520px] md:h-[560px]"
      }`}
    >
      {/* Subtle architectural coordinate grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "radial-gradient(#DCDCD3 1px, transparent 1px), linear-gradient(to right, rgba(220,220,211,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(220,220,211,0.28) 1px, transparent 1px)",
          backgroundSize: "24px 24px, 96px 96px, 96px 96px",
        }}
      />

      {/* Top telemetry bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-axiom-softline bg-axiom-paper/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-2 w-2 rounded-full bg-axiom-green animate-pulse" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-axiom-ink font-medium">
            LIVE COMMERCE SIGNAL NETWORK · 3D TOPOLOGY
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-axiom-muted">
          <span className="hidden sm:inline">
            ACTIVE SIGNAL:{" "}
            <strong className="text-axiom-blue">{activePulseNode.label}</strong>
          </span>
          <span className="rounded-full border border-axiom-line bg-white/80 px-2.5 py-0.5 text-axiom-ink">
            {activeEventLabel}
          </span>
        </div>
      </div>

      {/* Three.js WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full pointer-events-none"
      />

      {/* Projected 3D Interactive Node Overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {NETWORK_NODES.map((node, index) => {
          const coords = projected.find((p) => p.id === node.id);
          const isSelected = selectedId === node.id;
          const isPulsing = pulseStep === index;

          // Fallback percentage layout prior to first WebGL frame
          const leftStyle = coords ? `${coords.x}px` : `${12 + index * 10}%`;
          const topStyle = coords ? `${coords.y}px` : `${25 + (index % 3) * 22}%`;

          const badgeAccent =
            node.category === "recovery"
              ? "border-axiom-green/40 bg-axiom-greensoft/90 text-axiom-green"
              : node.category === "intent" && node.id === "hesitation"
              ? "border-axiom-red/40 bg-axiom-redsoft/90 text-axiom-red"
              : node.category === "intent" || node.category === "market"
              ? "border-axiom-blue/45 bg-axiom-bluesoft/90 text-axiom-blue"
              : "border-axiom-line bg-axiom-paper/95 text-axiom-ink";

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => {
                setSelectedId(node.id);
                onSelectNode?.(node);
              }}
              style={{
                left: leftStyle,
                top: topStyle,
                transform: "translate(-50%, -50%)",
              }}
              className={`pointer-events-auto absolute group transition-all duration-200 rounded-xl border px-2.5 py-1.5 text-left backdrop-blur-md shadow-subtle ${badgeAccent} ${
                isSelected
                  ? "ring-2 ring-axiom-blue scale-105 z-30"
                  : isPulsing
                  ? "ring-1 ring-axiom-blue/50 scale-[1.02] z-20"
                  : "hover:scale-105 hover:z-30 opacity-95"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: node.color }}
                />
                <span className="font-mono text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap">
                  {node.id === "intent" ? `INTENT ${intentScorePct}%` : node.label}
                </span>
              </div>
              {!compact && (
                <div className="mt-0.5 text-[11px] font-sans text-axiom-muted whitespace-nowrap">
                  {node.sublabel}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Floating Inspector Strip */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-axiom-line bg-axiom-paper/90 px-4 py-2.5 backdrop-blur-md shadow-subtle">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-axiom-ink px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white">
            {selectedNode.code}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-bold text-axiom-ink">
                {selectedNode.label}
              </span>
              <span className="text-xs text-axiom-muted">·</span>
              <span className="font-mono text-xs text-axiom-blue font-medium">
                {selectedNode.metric}
              </span>
            </div>
            <p className="text-[11px] text-axiom-muted">{selectedNode.sublabel}</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 font-mono text-[10px] text-axiom-muted">
          <span>SHOPPER</span>
          <span>→</span>
          <span>BEHAVIOR</span>
          <span>→</span>
          <span className="text-axiom-blue font-semibold">INTENT ({intentScorePct}%)</span>
          <span>→</span>
          <span>MARKET</span>
          <span>→</span>
          <span className="text-axiom-green font-semibold">RECOVERY</span>
        </div>
      </div>
    </div>
  );
}
