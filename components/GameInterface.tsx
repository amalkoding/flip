"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Wine, Coins, Info } from "lucide-react";

export function GameInterface() {
    const { publicKey, connected } = useWallet();
    const address = publicKey?.toBase58();
    const [amount, setAmount] = useState("");
    const [isFlipping, setIsFlipping] = useState(false);
    const [result, setResult] = useState<"win" | "loss" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);

    const fetcher = (url: string) => fetch(url).then((res) => res.json());

    const { data: userData, mutate } = useSWR(
        connected && address ? `/api/users?wallet=${address}` : null,
        fetcher
    );

    useEffect(() => {
        if (userData?.balance) {
            setBalance(userData.balance);
        }
    }, [userData]);

    const handleFlip = async () => {
        if (!connected || !address) {
            setError("Please connect your wallet first");
            return;
        }

        const wager = parseInt(amount);
        if (isNaN(wager) || wager <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        if (wager > balance) {
            setError("Insufficient balance");
            return;
        }

        setIsFlipping(true);
        setError(null);
        setResult(null);

        try {
            // Call API
            const response = await fetch("/api/game/flip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: address,
                    amount: wager
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Game failed");
            }

            // Simulate flip duration (wait for animation)
            setTimeout(() => {
                setIsFlipping(false);
                setResult(data.win ? "win" : "loss");
                setBalance(data.newBalance);
                mutate(); // Refresh SWR data
            }, 2000); // 2 seconds animation

        } catch (err: any) {
            setError(err.message);
            setIsFlipping(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center gap-8 py-12 px-4 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Flip Bottle</h1>
                <p className="text-muted-foreground text-lg">Test your luck and double your tokens.</p>
            </div>

            <Card className="w-full max-w-md border-2 shadow-2xl bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50">
                <CardHeader className="text-center p-6 pb-2">
                    {/* Bottle Animation Area */}
                    <div className="mx-auto mb-8 h-48 w-full flex items-center justify-center perspective-1000">
                        <div className={`relative transition-all duration-700 ${isFlipping ? 'animate-[spin_0.5s_linear_infinite]' : ''}`}>
                            <Wine className={`h-32 w-32 ${result === 'win' ? 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]' :
                                result === 'loss' ? 'text-red-500 opacity-50' :
                                    'text-primary'
                                } transition-all duration-300`} />

                            {/* Particle/Sparkle Effects for Win */}
                            {result === 'win' && !isFlipping && (
                                <div className="absolute inset-0 animate-ping opacity-20 bg-green-500 rounded-full" />
                            )}
                        </div>
                    </div>

                    <CardTitle className="text-3xl font-bold">
                        {isFlipping ? "Flipping..." :
                            result === "win" ? "YOU WON!" :
                                result === "loss" ? "YOU LOST" :
                                    "Place Your Bet"}
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        {result === "win" ? `+${amount} FLIP Added to Balance` :
                            result === "loss" ? `-${amount} FLIP Deducted` :
                                "Enter the amount of FLIP tokens you want to wager."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6 pt-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label htmlFor="amount" className="text-base font-medium">Wager Amount</Label>
                            <span className="text-sm text-muted-foreground">Balance: {balance} FLIP</span>
                        </div>

                        <div className="relative group">
                            <Coins className="absolute left-3 top-3 h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary group-focus-within:text-primary" />
                            <Input
                                id="amount"
                                placeholder="100"
                                className="pl-10 h-14 text-xl font-semibold transition-all border-input hover:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={isFlipping}
                            />
                            <span className="absolute right-4 top-4 text-sm font-bold text-muted-foreground">FLIP</span>
                        </div>
                        {error && <p className="text-sm text-red-500 font-medium animate-pulse">{error}</p>}
                    </div>

                    <div className="rounded-lg bg-secondary/50 p-4 text-sm text-secondary-foreground flex items-start gap-3 border border-secondary">
                        <Info className="h-5 w-5 shrink-0 text-primary" />
                        <p className="leading-snug">Win to double your FLIP tokens immediately. Smart contract verified fair.</p>
                    </div>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                    <Button
                        className={`w-full h-14 text-xl font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${isFlipping ? 'cursor-not-allowed opacity-80' :
                            'shadow-primary/20 hover:shadow-primary/40'
                            }`}
                        size="lg"
                        onClick={handleFlip}
                        disabled={isFlipping || !connected || !amount}
                    >
                        {isFlipping ? "FLIPPING..." : "FLIP BOTTLE"}
                    </Button>
                </CardFooter>
            </Card>

            <div className="text-center text-sm text-muted-foreground mt-8 max-w-lg">
                <p>By playing, you agree to the Terms of Service. Please gamble responsibly.</p>
            </div>
        </div>
    );
}
