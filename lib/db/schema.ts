import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  region: text("region"),
  vibe: text("vibe"),
  accent: text("accent"),
  imageUrl: text("image_url"),
  nameOptions: jsonb("name_options")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  capacity: integer("capacity").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    studentEmail: text("student_email").notNull().unique(),
    /** 0-based seat within the team (capacity slots). */
    seatIndex: integer("seat_index").notNull(),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    teamIdIdx: index("enrollments_team_id_idx").on(table.teamId),
    teamSeatUnique: uniqueIndex("enrollments_team_seat_unique").on(
      table.teamId,
      table.seatIndex,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
