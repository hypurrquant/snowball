import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AuroraBackground } from "@/components/background/AuroraBackground";
import { SnowParticles } from "@/components/background/SnowParticles";
import { SnowballAnimation } from "@/components/background/SnowballAnimation";
import { SnowGround } from "@/components/background/SnowGround";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snowball",
  description:
    "DeFi Protocol on Creditcoin — Swap, Lend, Borrow, Earn & Binary Options",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          {/* Background layer */}
          <AuroraBackground />
          <SnowParticles />
          <SnowGround />
          <SnowballAnimation />

          {/* Content layer */}
          <div className="relative flex min-h-screen" style={{ zIndex: 2 }}>
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
