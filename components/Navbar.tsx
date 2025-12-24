"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton, WalletDisconnectButton } from "@solana/wallet-adapter-react-ui";
import { ModeToggle } from "@/components/ModeToggle";
import { WalletModal } from "@/components/WalletModal";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export function Navbar() {
    const { connected } = useWallet();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl font-bold tracking-tighter">FLIP</span>
                </Link>
                <div className="flex items-center gap-2">
                    <ModeToggle />
                    <WalletModal />
                    {connected && (
                        <WalletDisconnectButton className="!bg-transparent !text-muted-foreground hover:!text-foreground !h-9 !w-9 !p-0 !rounded-md" />
                    )}
                </div>
            </div>
        </nav>
    );
}
