import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const scoopRoomsTable = pgTable(
  "scoop_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 8 }).notNull().unique(),
    phase: varchar("phase", { length: 16 }).notNull().default("lobby"),
    round: integer("round").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const scoopPlayersTable = pgTable(
  "scoop_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => scoopRoomsTable.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 32 }).notNull(),
    isHost: boolean("is_host").notNull().default(false),
    sessionHash: text("session_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("scoop_players_room_idx").on(table.roomId)],
);

export const scoopQuestionsTable = pgTable(
  "scoop_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => scoopRoomsTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    prompt: varchar("prompt", { length: 280 }).notNull(),
  },
  (table) => [
    unique("scoop_questions_room_position_unique").on(
      table.roomId,
      table.position,
    ),
  ],
);

export const scoopAnswersTable = pgTable(
  "scoop_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => scoopRoomsTable.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => scoopQuestionsTable.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => scoopPlayersTable.id, { onDelete: "cascade" }),
    answer: varchar("answer", { length: 120 }).notNull(),
    normalizedAnswer: varchar("normalized_answer", { length: 120 }).notNull(),
    points: integer("points"),
    tier: varchar("tier", { length: 24 }),
    ingredient: varchar("ingredient", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("scoop_answers_question_player_unique").on(
      table.questionId,
      table.playerId,
    ),
    index("scoop_answers_room_question_idx").on(
      table.roomId,
      table.questionId,
    ),
  ],
);
