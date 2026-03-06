"use client";

import { useEffect, useRef } from "react";
import { getGroundY } from "./snowTerrain";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  maxOpacity: number;
  landing: boolean; // true = fading out on ground contact
}

const PARTICLE_COUNT = 60;

export function SnowParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
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

    function createParticle(w: number, h: number, randomY = false): Particle {
      const maxOpacity = Math.random() * 0.25 + 0.05;
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h * 0.85 : -5, // don't start below ground
        size: Math.random() * 2 + 0.5,
        speedY: Math.random() * 0.4 + 0.15,
        speedX: Math.random() * 0.3 - 0.15,
        opacity: maxOpacity,
        maxOpacity,
        landing: false,
      };
    }

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(canvas.width, canvas.height, true)
    );

    function animate() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];

        if (!p.landing) {
          p.y += p.speedY;
          p.x += p.speedX;
          p.x += Math.sin(p.y * 0.01) * 0.1;

          // Check if particle reached the snow ground surface
          const groundY = getGroundY(p.x, w, h);
          if (p.y >= groundY) {
            p.landing = true;
            p.y = groundY; // snap to surface
          }

          // Off screen sideways → respawn
          if (p.x < -5 || p.x > w + 5) {
            particlesRef.current[i] = createParticle(w, h);
            continue;
          }
        } else {
          // Landing: fade out quickly to simulate "settling" into snow
          p.opacity -= 0.008;
          if (p.opacity <= 0) {
            particlesRef.current[i] = createParticle(w, h);
            continue;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${p.opacity})`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
