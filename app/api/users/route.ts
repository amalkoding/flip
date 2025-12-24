import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/users?wallet=0x... - Get user by wallet address
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const wallet = searchParams.get("wallet");

        if (!wallet) {
            return NextResponse.json(
                { error: "Wallet address is required" },
                { status: 400 }
            );
        }

        const user = await db
            .select()
            .from(users)
            .where(eq(users.walletAddress, wallet.toLowerCase()))
            .limit(1);

        if (user.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user[0]);
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json(
            { error: "Failed to fetch user" },
            { status: 500 }
        );
    }
}

// POST /api/users - Create or update user on wallet connection
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { walletAddress, username } = body;

        if (!walletAddress) {
            return NextResponse.json(
                { error: "Wallet address is required" },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.walletAddress, walletAddress.toLowerCase()))
            .limit(1);

        if (existingUser.length > 0) {
            // Update existing user
            if (username) {
                await db
                    .update(users)
                    .set({ username, updatedAt: new Date() })
                    .where(eq(users.walletAddress, walletAddress.toLowerCase()));
            }
            return NextResponse.json(existingUser[0]);
        }

        // Create new user
        const newUser = await db
            .insert(users)
            .values({
                walletAddress: walletAddress.toLowerCase(),
                username: username || `Player_${walletAddress.slice(0, 6)}`,
                balance: 0, // Initial balance - empty
            })
            .returning();

        return NextResponse.json(newUser[0], { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
        );
    }
}

// PATCH /api/users - Update user balance
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { walletAddress, balanceChange } = body;

        if (!walletAddress || balanceChange === undefined) {
            return NextResponse.json(
                { error: "Wallet address and balance change are required" },
                { status: 400 }
            );
        }

        // Validate balanceChange is a valid number
        const amount = parseInt(balanceChange);
        if (isNaN(amount) || amount === 0) {
            return NextResponse.json(
                { error: "Invalid amount" },
                { status: 400 }
            );
        }

        const user = await db
            .select()
            .from(users)
            .where(eq(users.walletAddress, walletAddress.toLowerCase()))
            .limit(1);

        if (user.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const currentBalance = user[0].balance;

        // Validate withdraw - check sufficient balance
        if (amount < 0) {
            const withdrawAmount = Math.abs(amount);
            if (withdrawAmount > currentBalance) {
                return NextResponse.json(
                    { error: "Insufficient balance", currentBalance },
                    { status: 400 }
                );
            }
        }

        const newBalance = currentBalance + amount;

        await db
            .update(users)
            .set({ balance: newBalance, updatedAt: new Date() })
            .where(eq(users.walletAddress, walletAddress.toLowerCase()));

        return NextResponse.json({
            success: true,
            balance: newBalance,
            previousBalance: currentBalance,
            change: amount
        });
    } catch (error) {
        console.error("Error updating user balance:", error);
        return NextResponse.json(
            { error: "Failed to update balance" },
            { status: 500 }
        );
    }
}
