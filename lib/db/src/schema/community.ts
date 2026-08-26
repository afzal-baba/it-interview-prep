import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { coursesTable } from "./courses";
import { usersTable } from "./auth";
import { z } from "zod/v4";

export const communityQuestionsTable = pgTable("community_questions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  courseId: integer("course_id").notNull().references(() => coursesTable.id),
  questionText: text("question_text").notNull(),
  companyName: text("company_name"),
  roundStage: text("round_stage"),
  difficulty: text("difficulty"),
  status: text("status").notNull().default("pending"),
  aiExplanation: jsonb("ai_explanation").$type<{ concept: string; approach: string; example_answer: string } | null>(),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const communityQuestionVotesTable = pgTable("community_question_votes", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => communityQuestionsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  value: integer("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [unique("community_question_vote_unique").on(table.questionId, table.userId)]);

export const communityReportsTable = pgTable("community_reports", {
  id: serial("id").primaryKey(),
  targetType: text("target_type").notNull().default("question"),
  targetId: integer("target_id").notNull(),
  reporterId: varchar("reporter_id").notNull().references(() => usersTable.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunityQuestionSchema = createInsertSchema(communityQuestionsTable).omit({ id: true, createdAt: true, updatedAt: true, upvotes: true, downvotes: true, status: true, aiExplanation: true });
export type CommunityQuestion = typeof communityQuestionsTable.$inferSelect;
export type InsertCommunityQuestion = z.infer<typeof insertCommunityQuestionSchema>;