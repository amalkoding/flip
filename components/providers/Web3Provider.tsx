"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletError } from "@solana/wallet-adapter-base";

// Import Solana wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

function SolanaProviderInner({ children }: { children: React.ReactNode }) {
    // Use Helius RPC for reliable Mainnet access
    const endpoint = useMemo(() => "https://mainnet.helius-rpc.com/?api-key=d49c5e57-97af-4b62-a79b-811c31e552ea", []);

    // Initialize wallets - empty array lets Wallet Standard handle detection
    // This prevents duplicate keys from manual + auto-detected wallets
    const wallets = useMemo(() => [], []);

    // Error handler - suppress "User rejected" errors
    const onError = useCallback((error: WalletError) => {
        // Don't show error for user rejections - this is normal behavior
        if (error.message?.includes("User rejected") ||
            error.name === "WalletConnectionError") {
            console.log("Wallet connection cancelled by user");
            return;
        }
        console.error("Wallet error:", error);
    }, []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect={false} onError={onError}>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

// Wrapper to handle hydration - prevents SSR mismatch
function MountedWrapper({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return <>{children}</>;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <MountedWrapper>
            <SolanaProviderInner>
                {children}
            </SolanaProviderInner>
        </MountedWrapper>
    );
}
