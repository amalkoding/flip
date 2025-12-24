import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rooms, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/rooms - Fetch all active rooms
export async function GET() {
    try {
        const allRooms = await db
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
            .orderBy(desc(rooms.createdAt));

        return NextResponse.json(allRooms);
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return NextResponse.json(
            { error: "Failed to fetch rooms" },
            { status: 500 }
        );
    }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { walletAddress, stake } = body;

        if (!walletAddress || !stake) {
            return NextResponse.json(
                { error: "Wallet address and stake are required" },
                { status: 400 }
            );
        }

        // Find or create user
        let user = await db
            .select()
            .from(users)
            .where(eq(users.walletAddress, walletAddress.toLowerCase()))
            .limit(1);

        let userId: string;

        if (user.length === 0) {
            // Create new user
            const newUser = await db
                .insert(users)
                .values({
                    walletAddress: walletAddress.toLowerCase(),
                    username: `Player_${walletAddress.slice(0, 6)}`,
                    balance: 0, // Initial balance - empty
                })
                .returning();
            userId = newUser[0].id;
        } else {
            userId = user[0].id;
        }

        const userBalance = user.length > 0 ? user[0].balance : 0;
        if (userBalance < parseInt(stake)) {
            return NextResponse.json(
                { error: "Insufficient balance to create room" },
                { status: 400 }
            );
        }

        // Create room
        const newRoom = await db
            .insert(rooms)
            .values({
                hostId: userId,
                stake: parseInt(stake),
                status: "WAITING",
            })
            .returning();

        return NextResponse.json(newRoom[0], { status: 201 });
    } catch (error) {
        console.error("Error creating room:", error);
        return NextResponse.json(
            { error: "Failed to create room" },
            { status: 500 }
        );
    }
}
