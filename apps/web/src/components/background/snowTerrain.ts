/** Shared snow ground surface calculation — used by SnowGround, SnowballAnimation, SnowParticles */
export function getGroundY(x: number, w: number, h: number): number {
  const baseY = h - h * 0.06;
  const nx = x / w;
  return (
    baseY +
    Math.sin(nx * Math.PI * 3.2) * 6 +
    Math.sin(nx * Math.PI * 7.5 + 0.5) * 3 +
    Math.sin(nx * Math.PI * 1.1 + 2) * 8 +
    Math.cos(nx * Math.PI * 5.3 + 1) * 2
  );
}
