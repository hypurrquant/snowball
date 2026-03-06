"use client";

import { useEffect, useRef } from "react";
import { getGroundY } from "./snowTerrain";

export function SnowGround() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const w = canvas.width;
      const h = canvas.height;
      const baseY = h - h * 0.06;

      // Fill snow ground shape
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 2) {
        ctx.lineTo(x, getGroundY(x, w, h));
      }
      ctx.lineTo(w, h);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, baseY - 15, 0, h);
      grad.addColorStop(0, "rgba(210, 225, 245, 0.25)");
      grad.addColorStop(0.3, "rgba(195, 215, 240, 0.18)");
      grad.addColorStop(0.7, "rgba(180, 205, 235, 0.12)");
      grad.addColorStop(1, "rgba(170, 195, 230, 0.06)");
      ctx.fillStyle = grad;
      ctx.fill();

      // Top edge highlight
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y = getGroundY(x, w, h);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(220, 235, 255, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sparkle dots
      for (let i = 0; i < 50; i++) {
        const sx = Math.random() * w;
        const surfaceY = getGroundY(sx, w, h);
        const sy = surfaceY + Math.random() * (h - surfaceY) * 0.5;

        ctx.beginPath();
        ctx.arc(sx, sy, Math.random() * 1.5 + 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(215, 235, 255, ${Math.random() * 0.2 + 0.05})`;
        ctx.fill();
      }
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
