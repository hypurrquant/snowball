"use client";

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {/* Base dark */}
      <div className="absolute inset-0 bg-bg-primary" />

      {/* Aurora gradients */}
      <div
        className="absolute inset-0 opacity-50 animate-float"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(59, 130, 246, 0.2), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(96, 165, 250, 0.15), transparent)",
        }}
      />
      <div
        className="absolute inset-0 opacity-35"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 60% 10%, rgba(37, 99, 235, 0.18), transparent)",
          animationName: "float",
          animationDuration: "8s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDirection: "reverse",
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
    </div>
  );
}
