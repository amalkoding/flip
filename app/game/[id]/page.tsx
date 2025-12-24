"use client";

import { useState, useEffect, use } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Wine, Trophy, Timer, XCircle, Users, Loader2, Coins, Wallet } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import useSWR from "swr";

interface RoomData {
    id: string;
    stake: number;
    status: "WAITING" | "PLAYING" | "FINISHED";
    host: {
        id: string;
        username: string | null;
        walletAddress: string;
    } | null;
    error?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function GameRoom({ params }: { params: Promise<{ id: string }> }) {
    const { id: roomId } = use(params);
    const { publicKey, connected } = useWallet();
    const address = publicKey?.toBase58() || "";
    const [status, setStatus] = useState<"WAITING" | "COUNTDOWN" | "FLIPPING" | "RESULT">("WAITING");
    const [winner, setWinner] = useState<"PLAYER" | "OPPONENT" | null>(null);
    const [opponent, setOpponent] = useState<string | null>(null);

    // Fetch room data
    const { data: room, isLoading, mutate } = useSWR<RoomData>(
        roomId ? `/api/rooms/${roomId}` : null,
        fetcher,
        { refreshInterval: 2000 }
    );

    const isHost = room?.host?.walletAddress?.toLowerCase() === address?.toLowerCase();

    // Handle room status changes
    useEffect(() => {
        if (room?.status === "PLAYING" && status === "WAITING") {
            setStatus("COUNTDOWN");
            // Simulate opponent joining
            setOpponent("Challenger");
        }
    }, [room?.status, status]);

    // Game countdown and flip animation
    useEffect(() => {
        if (status === "COUNTDOWN") {
            const timer = setTimeout(() => {
                setStatus("FLIPPING");
            }, 3000);
            return () => clearTimeout(timer);
        }
        if (status === "FLIPPING") {
            const timer = setTimeout(() => {
                setStatus("RESULT");
                const playerWon = Math.random() > 0.5;
                setWinner(playerWon ? "PLAYER" : "OPPONENT");

                // Update room status in database
                fetch(`/api/rooms/${roomId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "FINISHED" }),
                });

                // Update balance based on result
                if (address && room?.stake) {
                    fetch("/api/users", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            walletAddress: address,
                            balanceChange: playerWon ? room.stake : -room.stake,
                        }),
                    });
                }
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [status, roomId, address, room?.stake]);

    if (!connected) {
        return (
            <main className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50 dark:opacity-20" />
                <Navbar />
                <div className="flex-1 container mx-auto px-4 pt-24 pb-12 flex flex-col items-center justify-center relative z-10">
                    <Card className="max-w-md w-full">
                        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                            <Wallet className="h-16 w-16 text-muted-foreground" />
                            <h2 className="text-xl font-bold">Wallet Required</h2>
                            <p className="text-muted-foreground">Please connect your wallet to join this game.</p>
                            <Link href="/">
                                <Button>Return to Lobby</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </main>
        );
    }

    if (isLoading) {
        return (
            <main className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50 dark:opacity-20" />
                <Navbar />
                <div className="flex-1 container mx-auto px-4 pt-24 pb-12 flex flex-col items-center justify-center relative z-10">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading room...</p>
                </div>
            </main>
        );
    }

    if (!room || 'error' in room) {
        return (
            <main className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50 dark:opacity-20" />
                <Navbar />
                <div className="flex-1 container mx-auto px-4 pt-24 pb-12 flex flex-col items-center justify-center relative z-10">
                    <Card className="max-w-md w-full">
                        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                            <XCircle className="h-16 w-16 text-destructive" />
                            <h2 className="text-xl font-bold">Room Not Found</h2>
                            <p className="text-muted-foreground">This room doesn&apos;t exist or has been closed.</p>
                            <Link href="/">
                                <Button>Return to Lobby</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50 dark:opacity-20" />

            <Navbar />

            <div className="flex-1 container mx-auto px-4 pt-24 pb-12 flex flex-col items-center justify-center relative z-10">

                {/* Room Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <XCircle className="h-6 w-6 text-muted-foreground hover:text-foreground" />
                        </Button>
                    </Link>
                    <div className="flex flex-col items-center">
                        <Badge variant="outline" className="mb-1">Room #{roomId.slice(0, 8)}</Badge>
                        <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-primary" />
                            <span className="text-xl font-bold">{room.stake} FLIP</span>
                        </div>
                    </div>
                </div>

                {/* Arena */}
                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

                    {/* Player (You) */}
                    <Card className={`border-2 transform transition-all duration-500 ${winner === 'PLAYER' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] scale-105' : winner === 'OPPONENT' ? 'border-red-500 opacity-50' : 'border-primary/20'}`}>
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                                <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${address}`} />
                                <AvatarFallback>ME</AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                                <h3 className="text-lg font-bold">{isHost ? "You (Host)" : "You"}</h3>
                                <p className="text-sm text-muted-foreground font-mono">
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </p>
                            </div>
                            <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                                Ready
                            </Badge>
                        </CardContent>
                    </Card>

                    {/* Center Stage / VS */}
                    <div className="flex flex-col items-center justify-center gap-6 h-64">
                        {status === "WAITING" && (
                            <div className="animate-pulse flex flex-col items-center gap-2">
                                <Timer className="h-10 w-10 text-muted-foreground" />
                                <span className="text-xl font-medium text-muted-foreground">
                                    {isHost ? "Waiting for challenger..." : "Joining game..."}
                                </span>
                                <p className="text-sm text-muted-foreground">
                                    Stake: {room.stake} FLIP each
                                </p>
                            </div>
                        )}

                        {status === "COUNTDOWN" && (
                            <div className="text-6xl font-black text-primary animate-bounce">
                                VS
                            </div>
                        )}

                        {status === "FLIPPING" && (
                            <div className="relative">
                                <Wine className="h-24 w-24 text-primary animate-[spin_1s_ease-in-out_infinite]" />
                            </div>
                        )}

                        {status === "RESULT" && (
                            <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-300">
                                <Trophy className={`h-16 w-16 ${winner === 'PLAYER' ? 'text-green-500' : 'text-red-500'}`} />
                                <span className="text-2xl font-bold">
                                    {winner === 'PLAYER' ? "YOU WON!" : "YOU LOST"}
                                </span>
                                <p className="text-lg text-muted-foreground">
                                    {winner === 'PLAYER' ? `+${room.stake} FLIP` : `-${room.stake} FLIP`}
                                </p>
                                <div className="flex gap-2 mt-4">
                                    <Link href="/">
                                        <Button variant="outline">Back to Lobby</Button>
                                    </Link>
                                    <Link href="/">
                                        <Button>Play Again</Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Opponent */}
                    <Card className={`border-2 transition-all duration-500 ${winner === 'OPPONENT' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] scale-105' : winner === 'PLAYER' ? 'border-red-500 opacity-50' : 'border-muted'}`}>
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                            {status === "WAITING" ? (
                                <div className="h-24 w-24 rounded-full border-4 border-dashed border-muted flex items-center justify-center">
                                    <Users className="h-8 w-8 text-muted" />
                                </div>
                            ) : (
                                <Avatar className="h-24 w-24 border-4 border-background shadow-xl animate-in zoom-in fade-in">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${roomId}`} />
                                    <AvatarFallback>OP</AvatarFallback>
                                </Avatar>
                            )}

                            <div className="text-center">
                                <h3 className="text-lg font-bold">
                                    {status === "WAITING" ? "Searching..." : (isHost ? "Challenger" : room.host?.username || "Host")}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {status === "WAITING" ? "..." : (!isHost ? room.host?.walletAddress?.slice(0, 10) + "..." : "Ready to flip!")}
                                </p>
                            </div>
                            {status !== "WAITING" && (
                                <Badge variant="secondary">Ready</Badge>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </main>
    )
}
