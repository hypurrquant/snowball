import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Yield Vaults | Snowball",
    description: "Auto-compound your DeFi yields with Snowball Vaults",
};

export default function YieldLayout({ children }: { children: React.ReactNode }) {
    return children;
}
