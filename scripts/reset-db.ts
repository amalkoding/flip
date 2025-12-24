import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { games, rooms, users } from "../lib/db/schema";

async function resetDatabase() {
    console.log("🗑️  Resetting database...\n");

    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ DATABASE_URL not found in .env.local");
        process.exit(1);
    }

    try {
        const client = postgres(connectionString, { prepare: false });
        const db = drizzle(client);

        // Delete in order due to foreign key constraints
        console.log("Deleting games...");
        await db.delete(games);

        console.log("Deleting rooms...");
        await db.delete(rooms);

        console.log("Deleting users...");
        await db.delete(users);

        console.log("\n✅ Database reset complete!");
        console.log("All tables have been cleared.");

        // Close connection
        await client.end();
    } catch (error) {
        console.error("❌ Error resetting database:", error);
        process.exit(1);
    }

    process.exit(0);
}

resetDatabase();
