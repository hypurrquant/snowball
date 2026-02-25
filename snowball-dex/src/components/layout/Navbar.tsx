import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-bg-primary/80 backdrop-blur">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-accent-primary flex items-center justify-center text-bg-primary font-bold">
                            S
                        </div>
                        <span className="text-xl font-bold tracking-tight text-text-primary">
                            Snowball DEX
                        </span>
                    </Link>
                    <nav className="hidden md:flex gap-6">
                        <Link href="/" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                            Swap
                        </Link>
                        <Link href="/pool" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                            Pool
                        </Link>
                        <Link href="/analytics" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                            Analytics
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        Creditcoin Testnet
                    </div>
                    <ConnectButton />
                </div>
            </div>
        </header>
    );
}
