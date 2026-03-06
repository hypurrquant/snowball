"use client";

import { useEffect, useRef } from "react";
import { getGroundY } from "./snowTerrain";

// ── Types ──

type Phase = "accumulating" | "rolling";

interface Snowball {
  x: number;
  radius: number;
  rotation: number;
  phase: Phase;
  phaseTime: number;
}

interface TrailDot {
  x: number;
  y: number;
  opacity: number;
  size: number;
}

type CoinType = "btc" | "eth" | "ctc";

interface Coin {
  x: number;
  y: number;
  type: CoinType;
  rotation: number;
  scale: number;
  opacity: number;
  pulseOffset: number; // random phase offset for pulse
  absorbed: boolean;
  absorbProgress: number; // 0→1 animation
  radiusApplied: boolean; // prevent double radius increment
}

// ── Constants ──

const ACCUMULATE_DURATION = 10000; // 10s coins drop, then snowball rolls
const ROLL_SPEED = 135; // 1.5x
const BALL_BASE_RADIUS = 22;
const BALL_MAX_RADIUS = 38;
const COIN_SIZE = 9;
const COIN_COUNT = 20;
const ABSORB_SPEED = 0.003;

// ── Coin Style: frozen asset relics in unified ice-blue palette ──
// All coins share the same ice-blue base. Only the faintest tint differentiates them.
// They should feel like "frozen crystallized value" not "logo stickers".

const COIN_TINTS: Record<CoinType, [number, number, number]> = {
  btc: [180, 200, 235], // ice-blue with barely warm hint
  eth: [170, 195, 240], // pure ice-blue
  ctc: [175, 210, 230], // ice-blue with faint teal
};

function getCoinColor(type: CoinType, pulse: number) {
  const [r, g, b] = COIN_TINTS[type];
  // Very subtle pulse: breathing, not blinking
  const strokeA = 0.18 + pulse * 0.08; // 0.18 ~ 0.26
  const fillA = 0.06 + pulse * 0.04;   // 0.06 ~ 0.10
  const glowA = 0.04 + pulse * 0.03;   // 0.04 ~ 0.07
  return {
    stroke: `rgba(${r}, ${g}, ${b}, ${strokeA.toFixed(2)})`,
    fill: `rgba(${r}, ${g}, ${b}, ${fillA.toFixed(2)})`,
    glow: `rgba(${r}, ${g}, ${b}, ${glowA.toFixed(2)})`,
  };
}

// ── Coin Drawing: filled glyphs, not line icons ──

type CoinColors = ReturnType<typeof getCoinColor>;

function drawBTC(ctx: CanvasRenderingContext2D, size: number, c: CoinColors) {
  const r = size;
  // Diffuse glow
  const glow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.5);
  glow.addColorStop(0, c.glow);
  glow.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Filled circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = c.fill;
  ctx.fill();
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  // B symbol
  ctx.font = `bold ${r * 1.1}px "Inter", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = c.stroke;
  ctx.fillText("₿", 0, 0.5);
}

function drawETH(ctx: CanvasRenderingContext2D, size: number, c: CoinColors) {
  const r = size;
  // Diffuse glow
  const glow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.5);
  glow.addColorStop(0, c.glow);
  glow.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Filled diamond
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.6, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.6, 0);
  ctx.closePath();
  ctx.fillStyle = c.fill;
  ctx.fill();
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Faint middle line
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, 0);
  ctx.lineTo(r * 0.55, 0);
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function drawCTC(ctx: CanvasRenderingContext2D, size: number, c: CoinColors) {
  const r = size;
  const arcR = r * 0.75;
  // Diffuse glow
  const glow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.5);
  glow.addColorStop(0, c.glow);
  glow.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // C arc with fill-like thickness
  ctx.beginPath();
  ctx.arc(0, 0, arcR, 0.55, Math.PI * 2 - 0.55);
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.stroke();

  // Center line through opening
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(arcR, 0);
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fillStyle = c.stroke;
  ctx.fill();
}

type CoinDrawFn = (ctx: CanvasRenderingContext2D, size: number, c: CoinColors) => void;

const COIN_DRAWERS: Record<CoinType, CoinDrawFn> = {
  btc: drawBTC,
  eth: drawETH,
  ctc: drawCTC,
};

const COIN_TYPES: CoinType[] = ["btc", "eth", "ctc"];

// ── Component ──

export function SnowballAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snowballRef = useRef<Snowball>({
    x: -50,
    radius: BALL_BASE_RADIUS,
    rotation: 0,
    phase: "accumulating",
    phaseTime: 0,
  });
  const coinsRef = useRef<Coin[]>([]);
  const trailRef = useRef<TrailDot[]>([]);
  const lastTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    function spawnCoins() {
      const w = canvas!.width;
      const h = canvas!.height;
      coinsRef.current = [];

      // 4 zones, distribute coins evenly across zones, random within each
      const ZONES = 4;
      const coinsPerZone = Math.ceil(COIN_COUNT / ZONES);
      const zoneWidth = w / ZONES;

      for (let z = 0; z < ZONES; z++) {
        const count = Math.min(coinsPerZone, COIN_COUNT - z * coinsPerZone);
        for (let i = 0; i < count; i++) {
          const x = zoneWidth * z + 20 + Math.random() * (zoneWidth - 40);
          const groundY = getGroundY(x, w, h);
          // Place coins on the snow field (between surface and bottom)
          // Like they're scattered on the snowy ground, not just at the edge
          const snowFieldDepth = h - groundY;
          const y = groundY + Math.random() * snowFieldDepth * 0.6;

          const idx = z * coinsPerZone + i;
          coinsRef.current.push({
            x,
            y,
            type: COIN_TYPES[idx % COIN_TYPES.length],
            rotation: Math.random() * Math.PI * 2,
            scale: 0.8 + Math.random() * 0.4,
            opacity: 0,
            pulseOffset: Math.random() * Math.PI * 2,
            absorbed: false,
            absorbProgress: 0,
            radiusApplied: false,
          });
        }
      }
    }

    function resetCycle() {
      const sb = snowballRef.current;
      sb.x = -BALL_BASE_RADIUS * 2;
      sb.radius = BALL_BASE_RADIUS;
      sb.rotation = 0;
      sb.phase = "accumulating";
      sb.phaseTime = 0;
      trailRef.current = [];
      spawnCoins();
    }
    resetCycle();
    lastTimeRef.current = performance.now();

    function animate(now: number) {
      if (!canvas || !ctx) return;
      const dt = Math.min(now - lastTimeRef.current, 50);
      lastTimeRef.current = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const sb = snowballRef.current;
      sb.phaseTime += dt;
      const w = canvas.width;
      const h = canvas.height;

      // ── Phase logic ──

      switch (sb.phase) {
        case "accumulating": {
          // Coins fade in gradually during accumulation
          const progress = Math.min(sb.phaseTime / ACCUMULATE_DURATION, 1);
          for (const coin of coinsRef.current) {
            if (!coin.absorbed) {
              coin.opacity = Math.min(progress * 1.8, 1.0);
            }
          }
          if (progress >= 1) {
            sb.phase = "rolling";
            sb.phaseTime = 0;
            sb.x = -sb.radius * 2;
            sb.rotation = 0;
            trailRef.current = [];
          }
          break;
        }
        case "rolling": {
          sb.x += ROLL_SPEED * (dt / 1000);
          sb.rotation += (ROLL_SPEED * (dt / 1000)) / sb.radius;

          // Linear growth as it rolls across
          const rollProgress = Math.max(0, sb.x / w);
          sb.radius = BALL_BASE_RADIUS + (BALL_MAX_RADIUS - BALL_BASE_RADIUS) * Math.min(rollProgress, 1);

          // Check coin absorption
          for (const coin of coinsRef.current) {
            if (coin.absorbed) continue;
            const dist = Math.abs(coin.x - sb.x);
            if (dist < sb.radius * 1.5) {
              coin.absorbed = true;
            }
          }

          // Trail dots
          if (Math.random() > 0.5) {
            const groundY = getGroundY(sb.x, w, h);
            trailRef.current.push({
              x: sb.x - sb.radius * 0.6 + Math.random() * sb.radius * 0.3,
              y: groundY + Math.random() * 3,
              opacity: 0.18,
              size: Math.random() * 2 + 0.8,
            });
          }

          if (sb.x > w + sb.radius * 3) {
            resetCycle();
          }
          break;
        }
      }

      // ── Draw coins ──

      for (const coin of coinsRef.current) {
        if (coin.absorbed) {
          coin.absorbProgress = Math.min(coin.absorbProgress + dt * ABSORB_SPEED, 1);
          if (coin.absorbProgress >= 1) {
            coin.opacity = 0;
            continue;
          }

          // Fly toward snowball
          const groundY = getGroundY(sb.x, w, h);
          const ballCenterY = groundY - sb.radius;
          const ease = coin.absorbProgress * coin.absorbProgress;
          const drawX = coin.x + (sb.x - coin.x) * ease;
          const drawY = coin.y + (ballCenterY - coin.y) * ease;
          const drawScale = coin.scale * (1 - ease);
          const drawOpacity = coin.opacity * (1 - ease);

          if (drawOpacity > 0.01 && drawScale > 0.05) {
            const colors = getCoinColor(coin.type, 0.5);
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.rotate(coin.rotation + ease * Math.PI * 2);
            ctx.scale(drawScale, drawScale);
            ctx.globalAlpha = drawOpacity;
            COIN_DRAWERS[coin.type](ctx, COIN_SIZE, colors);
            ctx.restore();
          }
        } else if (coin.opacity > 0.01) {
          // Pulse: each coin oscillates at its own phase
          const pulse = (Math.sin(now * 0.002 + coin.pulseOffset) + 1) / 2; // 0~1
          const colors = getCoinColor(coin.type, pulse);

          ctx.save();
          // Only clip coins straddling the snow surface edge
          // (coin center is above ground line → top part sticks out, bottom hidden by snow ridge)
          const groundY = getGroundY(coin.x, w, h);
          if (coin.y < groundY) {
            // Show down to groundY + 1/4 coin height (max 1/4 hidden above the ridge)
            const clipBottom = coin.y + COIN_SIZE * coin.scale * 0.75;
            ctx.beginPath();
            ctx.rect(0, coin.y - COIN_SIZE * coin.scale * 2, w, clipBottom - (coin.y - COIN_SIZE * coin.scale * 2));
            ctx.clip();
          }
          // Coins below groundY: no clip needed, they sit on the snow field

          // Now draw the coin (rotation is local, clip is world-space)
          ctx.translate(coin.x, coin.y);
          ctx.rotate(coin.rotation);
          ctx.scale(coin.scale, coin.scale);
          ctx.globalAlpha = coin.opacity;

          COIN_DRAWERS[coin.type](ctx, COIN_SIZE, colors);
          ctx.restore();
        }
      }

      // ── Draw trail dots ──

      for (let i = trailRef.current.length - 1; i >= 0; i--) {
        const dot = trailRef.current[i];
        dot.opacity -= dt * 0.00012;
        if (dot.opacity <= 0) {
          trailRef.current.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${dot.opacity})`;
        ctx.fill();
      }

      // ── Draw snowball ──

      if (sb.phase === "rolling") {
        const groundY = getGroundY(sb.x, w, h);
        const centerY = groundY - sb.radius;

        const fadeIn = Math.min(Math.max((sb.x + sb.radius) / 80, 0), 1);
        const fadeOut = Math.min(Math.max((w + sb.radius * 2 - sb.x) / 80, 0), 1);
        const alpha = Math.min(fadeIn, fadeOut);

        ctx.save();
        ctx.translate(sb.x, centerY);
        ctx.rotate(sb.rotation);
        ctx.globalAlpha = alpha;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(0, 0, sb.radius * 0.5, 0, 0, sb.radius * 2.5);
        glowGrad.addColorStop(0, "rgba(180, 210, 255, 0.12)");
        glowGrad.addColorStop(1, "rgba(180, 210, 255, 0)");
        ctx.beginPath();
        ctx.arc(0, 0, sb.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Main ball
        const grad = ctx.createRadialGradient(
          -sb.radius * 0.3, -sb.radius * 0.3, sb.radius * 0.1,
          0, 0, sb.radius
        );
        grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        grad.addColorStop(0.5, "rgba(216, 236, 255, 0.8)");
        grad.addColorStop(1, "rgba(180, 210, 255, 0.6)");
        ctx.beginPath();
        ctx.arc(0, 0, sb.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Inner highlight
        const hlGrad = ctx.createRadialGradient(
          -sb.radius * 0.25, -sb.radius * 0.25, 0,
          -sb.radius * 0.25, -sb.radius * 0.25, sb.radius * 0.5
        );
        hlGrad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
        hlGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.beginPath();
        ctx.arc(0, 0, sb.radius, 0, Math.PI * 2);
        ctx.fillStyle = hlGrad;
        ctx.fill();

        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
