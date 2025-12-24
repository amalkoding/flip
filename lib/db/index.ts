import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Sanitize connection string (remove quotes if user included them in Vercel env vars)
let connectionString = process.env.DATABASE_URL!;
if (connectionString && connectionString.startsWith('"') && connectionString.endsWith('"')) {
    connectionString = connectionString.slice(1, -1);
}

// For connection pooling in serverless environment
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export * from "./schema";
