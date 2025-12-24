import { pgTable, text, integer, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";

// Enums
export const roomStatusEnum = pgEnum("room_status", ["WAITING", "PLAYING", "FINISHED"]);
export const gameResultEnum = pgEnum("game_result", ["PLAYER1", "PLAYER2"]);

// Users table - stores wallet-connected users
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    walletAddress: text("wallet_address").notNull().unique(),
    username: text("username"),
    balance: integer("balance").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rooms table - game lobbies
export const rooms = pgTable("rooms", {
    id: uuid("id").defaultRandom().primaryKey(),
    hostId: uuid("host_id").references(() => users.id).notNull(),
    stake: integer("stake").notNull(),
    status: roomStatusEnum("status").notNull().default("WAITING"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Games table - game history
export const games = pgTable("games", {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").references(() => rooms.id).notNull(),
    player1Id: uuid("player1_id").references(() => users.id).notNull(),
    player2Id: uuid("player2_id").references(() => users.id),
    winnerId: uuid("winner_id").references(() => users.id),
    stake: integer("stake").notNull(),
    result: gameResultEnum("result"),
    playedAt: timestamp("played_at").defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
