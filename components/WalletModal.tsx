"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Coins, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 1 SOL = 1,000,000 FLIP
const SOL_TO_FLIP_RATE = 1000000;

// Treasury wallet address to receive SOL payments
const TREASURY_WALLET = new PublicKey("7H7LfdH7y86KFydws3XFG6r1VY4iCkdD9JHK9RyZsfkn");

// Estimated gas fee in SOL (Solana transactions are very cheap)
const ESTIMATED_GAS_FEE = 0.000005; // ~5000 lamports

export function WalletModal() {
    const { publicKey, connected, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const [open, setOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [solBalance, setSolBalance] = useState<number>(0);

    const walletAddress = publicKey?.toBase58() || "";

    // Fetch SOL balance from Solana network
    useEffect(() => {
        if (connected && publicKey) {
            connection.getBalance(publicKey).then((balance) => {
                setSolBalance(balance / LAMPORTS_PER_SOL);
            }).catch(console.error);
        }
    }, [connected, publicKey, connection]);

    // Fetch user FLIP balance from database
    const { data: userData, mutate } = useSWR(
        connected && walletAddress ? `/api/users?wallet=${walletAddress}` : null,
        fetcher
    );

    // Create user on first connection
    useEffect(() => {
        if (connected && walletAddress && userData?.error === "User not found") {
            fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress }),
            }).then(() => mutate());
        }
    }, [connected, walletAddress, userData, mutate]);

    // Clear messages when dialog closes
    useEffect(() => {
        if (!open) {
            setError(null);
            setSuccess(null);
        }
    }, [open]);

    const flipBalance = userData?.balance ?? 0;
    const solBalanceDisplay = solBalance.toFixed(4);

    // Calculate required SOL for the FLIP amount (including gas fee)
    const depositAmountNum = parseInt(depositAmount) || 0;
    const requiredSol = depositAmountNum / SOL_TO_FLIP_RATE;
    const totalRequired = requiredSol + ESTIMATED_GAS_FEE;
    const hasEnoughSol = solBalance >= totalRequired;

    const handleDeposit = async () => {
        if (!publicKey || !walletAddress || !depositAmount) return;
        const amount = parseInt(depositAmount);
        if (isNaN(amount) || amount <= 0) {
            setError("Please enter a valid amount greater than 0");
            return;
        }

        const requiredSolAmount = amount / SOL_TO_FLIP_RATE;
        const totalWithGas = requiredSolAmount + ESTIMATED_GAS_FEE;

        if (solBalance < totalWithGas) {
            setError(`Insufficient SOL balance. You need ${totalWithGas.toFixed(6)} SOL (including gas) but only have ${solBalance.toFixed(6)} SOL.`);
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Create a transaction to transfer SOL (simulating payment)
            // In production, you would transfer to a real treasury wallet
            const lamportsToTransfer = Math.floor(requiredSolAmount * LAMPORTS_PER_SOL);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: lamportsToTransfer,
                })
            );

            // Get recent blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            // Send transaction for user to sign
            const signature = await sendTransaction(transaction, connection);

            // Wait for confirmation
            await connection.confirmTransaction(signature, "confirmed");

            // Update FLIP balance in database after successful transaction
            const response = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress,
                    balanceChange: amount,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Failed to update balance");
                return;
            }

            mutate();

            // Refresh SOL balance
            const newBalance = await connection.getBalance(publicKey);
            setSolBalance(newBalance / LAMPORTS_PER_SOL);

            setDepositAmount("");
            setSuccess(`Successfully swapped ${requiredSolAmount.toFixed(6)} SOL for ${amount} FLIP! Tx: ${signature.slice(0, 8)}...`);
        } catch (err: unknown) {
            console.error("Top up error:", err);
            const errorMessage = err instanceof Error ? err.message : "Transaction failed";
            if (errorMessage.includes("User rejected")) {
                setError("Transaction cancelled by user");
            } else {
                setError(`Transaction failed: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!walletAddress || !withdrawAmount) return;
        const amount = parseInt(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setError("Please enter a valid amount greater than 0");
            return;
        }
        if (amount > flipBalance) {
            setError(`Insufficient balance. You only have ${flipBalance} FLIP.`);
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            // In production, this would trigger a SOL transfer from treasury to user
            const response = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress,
                    balanceChange: -amount,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Failed to withdraw");
                return;
            }
            mutate();
            setWithdrawAmount("");
            const solToReceive = (amount / SOL_TO_FLIP_RATE).toFixed(6);
            setSuccess(`Successfully withdrew ${amount} FLIP (≈ ${solToReceive} SOL)!`);
        } catch (err) {
            console.error("Withdraw error:", err);
            setError("Failed to withdraw. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // If not connected, show Solana wallet button
    if (!connected) {
        return (
            <div className="wallet-adapter-button-wrapper">
                <WalletMultiButton />
            </div>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{flipBalance} FLIP</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Coins className="h-6 w-6 text-primary" />
                        Wallet Management
                    </DialogTitle>
                    <DialogDescription>
                        Swap SOL for FLIP tokens to play or withdraw your winnings.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {/* Wallet Balances */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="rounded-lg border bg-muted/30 p-3">
                            <span className="text-xs text-muted-foreground">SOL Balance</span>
                            <p className="text-lg font-bold">{solBalanceDisplay} SOL</p>
                        </div>
                        <div className="rounded-lg border bg-secondary/30 p-3">
                            <span className="text-xs text-muted-foreground">FLIP Balance</span>
                            <p className="text-lg font-bold text-primary">{flipBalance} FLIP</p>
                        </div>
                    </div>

                    {/* Exchange Rate Info */}
                    <div className="rounded-lg border bg-muted/20 p-2 mb-4 text-center">
                        <span className="text-xs text-muted-foreground">Rate: 1 SOL = {SOL_TO_FLIP_RATE} FLIP</span>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 mb-4 text-red-600 dark:text-red-400">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-3 mb-4 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{success}</span>
                        </div>
                    )}

                    <Tabs defaultValue="topup" className="w-full" onValueChange={() => { setError(null); setSuccess(null); }}>
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="topup">Top Up</TabsTrigger>
                            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                        </TabsList>

                        <TabsContent value="topup" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="deposit-amount">FLIP Amount to Buy</Label>
                                <div className="relative">
                                    <Input
                                        id="deposit-amount"
                                        placeholder="100"
                                        type="number"
                                        className="pl-14"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                    />
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">FLIP</span>
                                </div>
                                {depositAmountNum > 0 && (
                                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Amount:</span>
                                            <span className="font-medium">{requiredSol.toFixed(6)} SOL</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Gas Fee (est.):</span>
                                            <span className="font-medium">{ESTIMATED_GAS_FEE.toFixed(6)} SOL</span>
                                        </div>
                                        <div className="border-t pt-1 mt-1">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span>Total:</span>
                                                <span className={hasEnoughSol ? 'text-foreground' : 'text-red-500'}>
                                                    {totalRequired.toFixed(6)} SOL
                                                </span>
                                            </div>
                                        </div>
                                        {!hasEnoughSol && (
                                            <p className="text-xs text-red-500 mt-1">Not enough SOL in wallet</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <Button
                                className="w-full gap-2 mt-2"
                                onClick={handleDeposit}
                                disabled={isLoading || !depositAmount || !hasEnoughSol}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />}
                                {isLoading ? "Confirming Transaction..." : !hasEnoughSol && depositAmountNum > 0 ? "Insufficient SOL" : "Buy FLIP"}
                            </Button>
                        </TabsContent>

                        <TabsContent value="withdraw" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="withdraw-amount">FLIP Amount to Sell</Label>
                                <div className="relative">
                                    <Input
                                        id="withdraw-amount"
                                        placeholder="100"
                                        type="number"
                                        className="pl-14"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        max={flipBalance}
                                    />
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">FLIP</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Max: {flipBalance} FLIP</p>
                                {parseInt(withdrawAmount) > 0 && (
                                    <div className="rounded-lg border bg-muted/30 p-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">You will receive:</span>
                                            <span className="font-medium">
                                                {(parseInt(withdrawAmount) / SOL_TO_FLIP_RATE).toFixed(6)} SOL
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="destructive"
                                className="w-full gap-2 mt-2"
                                onClick={handleWithdraw}
                                disabled={isLoading || !withdrawAmount || parseInt(withdrawAmount) > flipBalance}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
                                Sell FLIP for SOL
                            </Button>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
