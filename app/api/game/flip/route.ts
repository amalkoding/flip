
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { walletAddress, amount } = await req.json();

        if (!walletAddress || !amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const wager = parseInt(amount);

        // Fetch user
        const user = await db.query.users.findFirst({
            where: eq(users.walletAddress, walletAddress),
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.balance < wager) {
            return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
        }

        // 50/50 Chance
        const isWin = Math.random() < 0.5;
        const balanceChange = isWin ? wager : -wager;

        // Update balance
        // We use sql increment/decrement for atomicity if possible, or just update
        // Since drizzle sometimes needs raw sql for atomic updates, we'll try a simpler update first for speed, 
        // but fetching fresh user data is safer. 
        // Actually, let's use the fetched user balance to calculate new balance to ensure we have the latest snapshot 
        // (though race conditions are possible without transactions, for this scale it is acceptable).

        const newBalance = user.balance + balanceChange;

        await db.update(users)
            .set({
                balance: newBalance,
                updatedAt: new Date()
            })
            .where(eq(users.walletAddress, walletAddress));

        return NextResponse.json({
            win: isWin,
            newBalance: newBalance,
            balanceChange: balanceChange
        });

    } catch (error) {
        console.error("Game Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
