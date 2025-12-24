"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Users, Coins, Loader2, RefreshCw, Wallet, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

interface RoomData {
    id: string;
    stake: number;
    status: "WAITING" | "PLAYING" | "FINISHED";
    createdAt: string;
    host: {
        id: string;
        username: string | null;
        walletAddress: string;
    } | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Lobby() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const address = publicKey?.toBase58() || "";
    const [createOpen, setCreateOpen] = useState(false);
    const [stake, setStake] = useState("100");
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);

    // Fetch rooms from API with polling
    const { data: rooms, isLoading, mutate } = useSWR<RoomData[]>(
        "/api/rooms",
        fetcher,
        { refreshInterval: 5000 } // Poll every 5 seconds
    );

    // Fetch user balance
    const { data: userData } = useSWR(
        connected && address ? `/api/users?wallet=${address}` : null,
        fetcher
    );

    const userBalance = userData?.balance ?? 0;
    const stakeAmount = parseInt(stake);
    const hasEnoughBalance = userBalance >= stakeAmount;

    const handleCreateRoom = async () => {
        if (!address) return;

        // Check balance before creating
        if (!hasEnoughBalance) {
            setCreateError(`Insufficient balance. You need ${stakeAmount} FLIP but only have ${userBalance} FLIP.`);
            return;
        }

        setIsCreating(true);
        setCreateError(null);
        try {
            const response = await fetch("/api/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: address,
                    stake: stake,
                }),
            });
            const newRoom = await response.json();
            if (newRoom.error) {
                setCreateError(newRoom.error);
                return;
            }
            if (newRoom.id) {
                setCreateOpen(false);
                router.push(`/game/${newRoom.id}`);
            }
        } catch (error) {
            console.error("Error creating room:", error);
            setCreateError("Failed to create room. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinRoom = async (roomId: string) => {
        if (!address) return;
        setIsJoining(roomId);
        try {
            await fetch(`/api/rooms/${roomId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress: address }),
            });
            router.push(`/game/${roomId}`);
        } catch (error) {
            console.error("Error joining room:", error);
        } finally {
            setIsJoining(null);
        }
    };

    const activeRooms = rooms?.filter(room => room.status !== "FINISHED") || [];

    return (
        <div className="w-full max-w-5xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Game Lobby</h1>
                    <p className="text-muted-foreground">Join an existing room or create your own to challenge others.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => mutate()}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>

                    <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setCreateError(null); }}>
                        <DialogTrigger asChild>
                            <Button
                                size="lg"
                                className="shadow-lg shadow-primary/20"
                                disabled={!connected}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Create Room
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create a New Room</DialogTitle>
                                <DialogDescription>Set your stakes and wait for a challenger.</DialogDescription>
                            </DialogHeader>

                            {!connected ? (
                                <div className="py-8 text-center">
                                    <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Please connect your wallet first to create a room.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4 py-4">
                                        {/* Balance Display */}
                                        <div className="rounded-lg border bg-muted/30 p-3">
                                            <span className="text-xs text-muted-foreground">Your Balance</span>
                                            <p className="text-xl font-bold text-primary">{userBalance} FLIP</p>
                                        </div>

                                        {/* Error Message */}
                                        {createError && (
                                            <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-red-600 dark:text-red-400">
                                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                <span className="text-sm">{createError}</span>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Select Stake Amount (FLIP)</label>
                                            <Select value={stake} onValueChange={setStake}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select amount" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="50" disabled={userBalance < 50}>50 FLIP {userBalance < 50 && "(Not enough)"}</SelectItem>
                                                    <SelectItem value="100" disabled={userBalance < 100}>100 FLIP {userBalance < 100 && "(Not enough)"}</SelectItem>
                                                    <SelectItem value="200" disabled={userBalance < 200}>200 FLIP {userBalance < 200 && "(Not enough)"}</SelectItem>
                                                    <SelectItem value="500" disabled={userBalance < 500}>500 FLIP {userBalance < 500 && "(Not enough)"}</SelectItem>
                                                    <SelectItem value="1000" disabled={userBalance < 1000}>1000 FLIP {userBalance < 1000 && "(Not enough)"}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="rounded-lg border bg-muted/30 p-3">
                                            <span className="text-xs text-muted-foreground">Your Wallet</span>
                                            <p className="font-mono text-sm truncate">{address}</p>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            className="w-full"
                                            onClick={handleCreateRoom}
                                            disabled={isCreating || !hasEnoughBalance}
                                        >
                                            {isCreating ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : !hasEnoughBalance ? (
                                                "Insufficient Balance"
                                            ) : (
                                                "Create & Join"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {!connected && (
                <Card className="border-purple-500/50 bg-gradient-to-r from-purple-500/10 to-purple-600/5">
                    <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-4 p-6">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-purple-500/20">
                            <Wallet className="h-8 w-8 text-purple-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-lg">Solana Wallet Required</p>
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
                                    Mainnet
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                                This game runs exclusively on <span className="font-semibold text-purple-600 dark:text-purple-400">Solana Network</span>.
                                Please connect a Solana-compatible wallet to play.
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="text-muted-foreground">Supported wallets:</span>
                                <a href="https://phantom.app" target="_blank" rel="noopener" className="text-purple-600 dark:text-purple-400 hover:underline">Phantom</a>
                                <span className="text-muted-foreground">•</span>
                                <a href="https://solflare.com" target="_blank" rel="noopener" className="text-purple-600 dark:text-purple-400 hover:underline">Solflare</a>
                                <span className="text-muted-foreground">•</span>
                                <a href="https://backpack.app" target="_blank" rel="noopener" className="text-purple-600 dark:text-purple-400 hover:underline">Backpack</a>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="border-muted/50 shadow-sm overflow-hidden backdrop-blur-sm bg-card/60">
                <CardHeader className="bg-muted/20">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" /> Active Rooms
                        {activeRooms.length > 0 && (
                            <Badge variant="secondary" className="ml-2">{activeRooms.length}</Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : activeRooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">No active rooms yet</p>
                            <p className="text-sm text-muted-foreground">Be the first to create one!</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[100px]">Room ID</TableHead>
                                    <TableHead>Host</TableHead>
                                    <TableHead>Stake</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeRooms.map((room) => (
                                    <TableRow key={room.id} className="cursor-pointer hover:bg-muted/30">
                                        <TableCell className="font-medium text-muted-foreground">
                                            #{room.id.slice(0, 8)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${room.host?.walletAddress}`} />
                                                    <AvatarFallback>{room.host?.username?.substring(0, 2) || "??"}</AvatarFallback>
                                                </Avatar>
                                                <span className="truncate max-w-[120px]">
                                                    {room.host?.username || room.host?.walletAddress?.slice(0, 10) + "..."}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 font-semibold text-primary">
                                                <Coins className="h-3.5 w-3.5" />
                                                {room.stake}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {room.status === "WAITING" ? (
                                                <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/10 hover:bg-green-500/20">
                                                    Waiting
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-muted-foreground">
                                                    Playing
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {room.status === "WAITING" ? (
                                                room.host?.walletAddress?.toLowerCase() === address?.toLowerCase() ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8"
                                                        onClick={() => router.push(`/game/${room.id}`)}
                                                    >
                                                        View Room
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={() => handleJoinRoom(room.id)}
                                                        disabled={!connected || isJoining === room.id || userBalance < room.stake}
                                                    >
                                                        {isJoining === room.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : userBalance < room.stake ? (
                                                            "No Funds"
                                                        ) : (
                                                            "Join Game"
                                                        )}
                                                    </Button>
                                                )
                                            ) : (
                                                <Button size="sm" variant="ghost" disabled className="h-8">
                                                    Spectate
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
