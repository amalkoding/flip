import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rooms, users, games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/rooms/[id] - Get room details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const room = await db
            .select({
                id: rooms.id,
                stake: rooms.stake,
                status: rooms.status,
                createdAt: rooms.createdAt,
                host: {
                    id: users.id,
                    username: users.username,
                    walletAddress: users.walletAddress,
                },
            })
            .from(rooms)
            .leftJoin(users, eq(rooms.hostId, users.id))
            .where(eq(rooms.id, id))
            .limit(1);

        if (room.length === 0) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        return NextResponse.json(room[0]);
    } catch (error) {
        console.error("Error fetching room:", error);
        return NextResponse.json(
            { error: "Failed to fetch room" },
            { status: 500 }
        );
    }
}

// PATCH /api/rooms/[id] - Join room / Update room status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { walletAddress, status, winnerId } = body;

        // Get room
        const existingRoom = await db
            .select()
            .from(rooms)
            .where(eq(rooms.id, id))
            .limit(1);

        if (existingRoom.length === 0) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        const room = existingRoom[0];

        // Join room logic
        if (walletAddress && room.status === "WAITING") {
            // Find or create player 2
            let player2 = await db
                .select()
                .from(users)
                .where(eq(users.walletAddress, walletAddress.toLowerCase()))
                .limit(1);

            let player2Id: string;
            let player2Balance: number = 0;

            if (player2.length === 0) {
                const newPlayer = await db
                    .insert(users)
                    .values({
                        walletAddress: walletAddress.toLowerCase(),
                        username: `Player_${walletAddress.slice(0, 6)}`,
                        balance: 0, // Initial balance - empty
                    })
                    .returning();
                player2Id = newPlayer[0].id;
                player2Balance = 0;
            } else {
                player2Id = player2[0].id;
                player2Balance = player2[0].balance;
            }

            if (player2Balance < room.stake) {
                return NextResponse.json({ error: "Insufficient balance to join room" }, { status: 400 });
            }

            // Create game record
            await db.insert(games).values({
                roomId: id,
                player1Id: room.hostId,
                player2Id: player2Id,
                stake: room.stake,
            });

            // Update room status
            await db
                .update(rooms)
                .set({ status: "PLAYING", updatedAt: new Date() })
                .where(eq(rooms.id, id));

            return NextResponse.json({ message: "Joined room successfully" });
        }

        // Update status or set winner
        if (status) {
            await db
                .update(rooms)
                .set({ status, updatedAt: new Date() })
                .where(eq(rooms.id, id));
        }

        if (winnerId) {
            await db
                .update(games)
                .set({ winnerId })
                .where(eq(games.roomId, id));
        }

        return NextResponse.json({ message: "Room updated successfully" });
    } catch (error) {
        console.error("Error updating room:", error);
        return NextResponse.json(
            { error: "Failed to update room" },
            { status: 500 }
        );
    }
}

// DELETE /api/rooms/[id] - Delete room
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await db.delete(games).where(eq(games.roomId, id));
        await db.delete(rooms).where(eq(rooms.id, id));

        return NextResponse.json({ message: "Room deleted successfully" });
    } catch (error) {
        console.error("Error deleting room:", error);
        return NextResponse.json(
            { error: "Failed to delete room" },
            { status: 500 }
        );
    }
}
