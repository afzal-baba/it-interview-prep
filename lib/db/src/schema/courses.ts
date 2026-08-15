import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id),
  level: text("level", { enum: ["beginner", "intermediate", "advanced"] }).notNull(),
  text: text("text").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctOptionIndex: integer("correct_option_index").notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id),
  level: text("level", { enum: ["beginner", "intermediate", "advanced"] }).notNull(),
  timedMode: boolean("timed_mode").default(false).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  // Server-computed results stored at submission time
  score: integer("score"),
  timeBonus: integer("time_bonus"),
  correctCount: integer("correct_count"),
  totalQuestions: integer("total_questions"),
  percentage: integer("percentage"),
});

export const leaderboardTable = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id),
  level: text("level", { enum: ["beginner", "intermediate", "advanced"] }).notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  percentage: integer("percentage").notNull(),
  badges: jsonb("badges").$type<string[]>().notNull().default([]),
  timedMode: boolean("timed_mode").default(false).notNull(),
  timeBonus: integer("time_bonus").default(0).notNull(),
  sessionId: integer("session_id").references(() => sessionsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, startedAt: true });
export const insertLeaderboardSchema = createInsertSchema(leaderboardTable).omit({ id: true, createdAt: true });

export type Course = typeof coursesTable.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Question = typeof questionsTable.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type LeaderboardEntry = typeof leaderboardTable.$inferSelect;
export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardSchema>;
