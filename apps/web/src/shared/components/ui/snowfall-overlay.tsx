"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  wind: number;
  opacity: number;
}

interface SnowfallOverlayProps {
  count?: number;
  zIndex?: number;
}

function createFlake(w: number, h: number, randomY = false): Flake {
  return {
    x: Math.random() * w,
    y: randomY ? Math.random() * h : -(Math.random() * 40),
    r: Math.random() * 3 + 1,
    speed: Math.random() * 1.5 + 0.5,
    wind: Math.random() * 0.6 - 0.3,
    opacity: Math.random() * 0.3 + 0.1,
  };
}

export function SnowfallOverlay({ count = 40, zIndex = 55 }: SnowfallOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flakesRef = useRef<Flake[]>([]);
  const rafRef = useRef<number>(0);

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

    flakesRef.current = Array.from({ length: count }, () =>
      createFlake(canvas.width, canvas.height, true),
    );

    const animate = () => {
      if (!canvas || !ctx) return;
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < flakesRef.current.length; i++) {
        const f = flakesRef.current[i];
        f.y += f.speed;
        f.x += f.wind + Math.sin(f.y * 0.01) * 0.3;

        if (f.y > h + 10 || f.x < -10 || f.x > w + 10) {
          flakesRef.current[i] = createFlake(w, h);
          continue;
        }

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 235, 255, ${f.opacity})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [count]);

  return createPortal(
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex }}
    />,
    document.body,
  );
}
