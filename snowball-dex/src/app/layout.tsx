import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Snowball DEX",
  description:
    "Concentrated Liquidity AMM on Creditcoin Testnet — Algebra V4 Integral Fork",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
