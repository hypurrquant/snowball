import type { Metadata } from "next";
import "@/styles/globals.css";

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
        {/* TODO: Wrap with WagmiProvider, QueryClientProvider, RainbowKitProvider */}
        {children}
      </body>
    </html>
  );
}
