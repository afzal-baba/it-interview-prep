import { Router, type Request } from "express";
import { and, asc, count, desc, eq, gte, ilike, sql } from "drizzle-orm";
import {
  communityQuestionsTable,
  communityQuestionVotesTable,
  communityReportsTable,
  coursesTable,
  db,
  usersTable,
} from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();
const profanity = /\b(fuck|shit|cunt|nazi|kys)\b/i;
const stages = ["phone screen", "technical round", "system design", "onsite"] as const;
const difficulties = ["easy", "medium", "hard"] as const;
const reasons = ["inappropriate", "duplicate", "incorrect"] as const;

type Submission = {
  questionText: string;
  courseId: number;
  companyName: string | null;
  roundStage: typeof stages[number] | null;
  difficulty: typeof difficulties[number] | null;
};

function parseSubmission(value: unknown): Submission | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const questionText = typeof body.questionText === "string" ? body.questionText.trim() : "";
  const courseId = Number(body.courseId);
  const companyName = body.companyName == null ? null : typeof body.companyName === "string" ? body.companyName.trim() : "";
  const roundStage = body.roundStage == null ? null : stages.includes(body.roundStage as typeof stages[number]) ? body.roundStage as typeof stages[number] : null;
  const difficulty = body.difficulty == null ? null : difficulties.includes(body.difficulty as typeof difficulties[number]) ? body.difficulty as typeof difficulties[number] : null;
  if (questionText.length < 20 || questionText.length > 2000 || !Number.isInteger(courseId) || courseId < 1 || companyName === "" || (body.roundStage != null && !roundStage) || (body.difficulty != null && !difficulty)) return null;
  return { questionText, courseId, companyName, roundStage, difficulty };
}

function authed(req: Request): req is Request & { user: NonNullable<Request["user"]> } {
  return req.isAuthenticated();
}

function rejectUnauthed(req: Request, res: any): boolean {
  if (authed(req)) return false;
  res.status(401).json({ error: "Sign in to use Community Questions." });
  return true;
}

function userKey(req: Request): string {
  return authed(req) ? req.user.id : String(req.ip ?? "anonymous");
}

async function withinDailyLimit(userId: string): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const [result] = await db.select({ total: count() })
    .from(communityQuestionsTable)
    .where(and(eq(communityQuestionsTable.userId, userId), gte(communityQuestionsTable.createdAt, startOfDay)));
  return Number(result?.total ?? 0) < 10;
}

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []);
}

function similarity(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

function parseAiJson(value: string): { concept: string; approach: string; example_answer: string } | null {
  try {
    const cleaned = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as Record<string, unknown>;
    if (typeof parsed.concept !== "string" || typeof parsed.approach !== "string" || typeof parsed.example_answer !== "string") return null;
    return { concept: parsed.concept.slice(0, 1500), approach: parsed.approach.slice(0, 2500), example_answer: parsed.example_answer.slice(0, 2500) };
  } catch {
    return null;
  }
}

async function generateExplanation(questionText: string, courseName: string) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8192,
      system: "Return ONLY valid JSON with keys concept, approach, example_answer. Be practical and coaching-oriented. Do not invent company-specific facts.",
      messages: [{ role: "user", content: `Technology: ${courseName}\nInterview scenario: ${questionText}\nExplain what it tests, how to approach it, and give a concise example answer.` }],
    });
    const block = response.content[0];
    return block?.type === "text" ? parseAiJson(block.text) : null;
  } catch {
    return null;
  }
}

router.get("/community/questions", async (req, res): Promise<void> => {
  const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
  const company = typeof req.query.company === "string" ? req.query.company.trim().slice(0, 120) : "";
  const difficulty = difficulties.includes(req.query.difficulty as typeof difficulties[number]) ? req.query.difficulty as string : undefined;
  const sort = req.query.sort === "helpful" ? "helpful" : "newest";
  const conditions = [
    eq(communityQuestionsTable.status, "published"),
    ...(courseId && Number.isInteger(courseId) ? [eq(communityQuestionsTable.courseId, courseId)] : []),
    ...(company ? [ilike(communityQuestionsTable.companyName, `%${company}%`)] : []),
    ...(difficulty ? [eq(communityQuestionsTable.difficulty, difficulty)] : []),
  ];
  const rows = await db.select({
    id: communityQuestionsTable.id,
    questionText: communityQuestionsTable.questionText,
    companyName: communityQuestionsTable.companyName,
    roundStage: communityQuestionsTable.roundStage,
    difficulty: communityQuestionsTable.difficulty,
    aiExplanation: communityQuestionsTable.aiExplanation,
    upvotes: communityQuestionsTable.upvotes,
    downvotes: communityQuestionsTable.downvotes,
    createdAt: communityQuestionsTable.createdAt,
    courseId: coursesTable.id,
    courseName: coursesTable.name,
    courseSlug: coursesTable.slug,
    contributor: usersTable.firstName,
  }).from(communityQuestionsTable)
    .innerJoin(coursesTable, eq(communityQuestionsTable.courseId, coursesTable.id))
    .innerJoin(usersTable, eq(communityQuestionsTable.userId, usersTable.id))
    .where(and(...conditions))
    .orderBy(sort === "helpful" ? desc(sql`${communityQuestionsTable.upvotes} - ${communityQuestionsTable.downvotes}`) : desc(communityQuestionsTable.createdAt))
    .limit(100);
  res.json(rows.map((row) => ({ ...row, contributor: row.contributor || "Anonymous" })));
});

router.get("/community/my-questions", async (req, res): Promise<void> => {
  if (rejectUnauthed(req, res)) return;
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Sign in to view your submissions." }); return; }
  const rows = await db.select({
    id: communityQuestionsTable.id,
    questionText: communityQuestionsTable.questionText,
    status: communityQuestionsTable.status,
    createdAt: communityQuestionsTable.createdAt,
    courseName: coursesTable.name,
  }).from(communityQuestionsTable)
    .innerJoin(coursesTable, eq(communityQuestionsTable.courseId, coursesTable.id))
    .where(eq(communityQuestionsTable.userId, userId))
    .orderBy(desc(communityQuestionsTable.createdAt))
    .limit(50);
  res.json(rows);
});

router.get("/community/companies", async (_req, res): Promise<void> => {
  const rows = await db.selectDistinct({ companyName: communityQuestionsTable.companyName })
    .from(communityQuestionsTable).where(and(eq(communityQuestionsTable.status, "published"), sql`${communityQuestionsTable.companyName} IS NOT NULL`))
    .orderBy(asc(communityQuestionsTable.companyName)).limit(100);
  res.json(rows.map((row) => row.companyName).filter(Boolean));
});

router.post("/community/questions", async (req, res): Promise<void> => {
  if (rejectUnauthed(req, res)) return;
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Sign in to use Community Questions." }); return; }
  const parsed = parseSubmission(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Add a question between 20 and 2000 characters and choose a technology." });
    return;
  }
  if (profanity.test(parsed.questionText) || (parsed.companyName && profanity.test(parsed.companyName))) {
    res.status(400).json({ error: "Please remove abusive or unsafe language before submitting." });
    return;
  }
  const [course] = await db.select({ id: coursesTable.id, name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, parsed.courseId)).limit(1);
  if (!course) {
    res.status(400).json({ error: "Choose a valid technology." });
    return;
  }
  const recent = await db.select({ questionText: communityQuestionsTable.questionText }).from(communityQuestionsTable)
    .where(and(eq(communityQuestionsTable.courseId, course.id), sql`${communityQuestionsTable.status} IN ('pending', 'published')`)).limit(100);
  if (recent.some((row) => similarity(row.questionText, parsed.questionText) >= 0.72)) {
    res.status(409).json({ error: "A very similar question already exists for this technology. Try adding a distinct scenario instead.", duplicate: true });
    return;
  }
  if (!(await withinDailyLimit(userId))) {
    res.status(429).json({ error: "Daily submission limit reached. Try again tomorrow." });
    return;
  }
  const explanation = await generateExplanation(parsed.questionText, course.name);
  const [created] = await db.insert(communityQuestionsTable).values({
    userId,
    courseId: course.id,
    questionText: parsed.questionText,
    companyName: parsed.companyName,
    roundStage: parsed.roundStage,
    difficulty: parsed.difficulty,
    aiExplanation: explanation,
  }).returning({ id: communityQuestionsTable.id, status: communityQuestionsTable.status });
  res.status(201).json({ ...created, explanationPending: !explanation });
});

router.post("/community/questions/:id/vote", async (req, res): Promise<void> => {
  if (rejectUnauthed(req, res)) return;
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Sign in to vote." }); return; }
  const questionId = Number(req.params.id);
  const value = Number(req.body?.value);
  if (!Number.isInteger(questionId) || ![1, -1].includes(value)) {
    res.status(400).json({ error: "Vote must be 1 or -1." });
    return;
  }
  try {
    await db.transaction(async (tx) => {
    const [question] = await tx.select({ id: communityQuestionsTable.id }).from(communityQuestionsTable).where(and(eq(communityQuestionsTable.id, questionId), eq(communityQuestionsTable.status, "published"))).limit(1);
    if (!question) throw new Error("NOT_FOUND");
    const [existing] = await tx.select().from(communityQuestionVotesTable).where(and(eq(communityQuestionVotesTable.questionId, questionId), eq(communityQuestionVotesTable.userId, userId))).limit(1);
    if (!existing) {
      await tx.insert(communityQuestionVotesTable).values({ questionId, userId, value });
      await tx.update(communityQuestionsTable).set(value === 1 ? { upvotes: sql`${communityQuestionsTable.upvotes} + 1` } : { downvotes: sql`${communityQuestionsTable.downvotes} + 1` }).where(eq(communityQuestionsTable.id, questionId));
    } else if (existing.value !== value) {
      await tx.update(communityQuestionVotesTable).set({ value }).where(eq(communityQuestionVotesTable.id, existing.id));
      await tx.update(communityQuestionsTable).set(value === 1 ? { upvotes: sql`${communityQuestionsTable.upvotes} + 1`, downvotes: sql`GREATEST(${communityQuestionsTable.downvotes} - 1, 0)` } : { downvotes: sql`${communityQuestionsTable.downvotes} + 1`, upvotes: sql`GREATEST(${communityQuestionsTable.upvotes} - 1, 0)` }).where(eq(communityQuestionsTable.id, questionId));
    }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      res.status(404).json({ error: "Question not found." });
      return;
    }
    throw error;
  }
  res.json({ ok: true });
});

router.post("/community/questions/:id/report", async (req, res): Promise<void> => {
  if (rejectUnauthed(req, res)) return;
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Sign in to report." }); return; }
  const questionId = Number(req.params.id);
  const reason = reasons.includes(req.body?.reason as typeof reasons[number]) ? req.body.reason : null;
  if (!Number.isInteger(questionId) || !reason) {
    res.status(400).json({ error: "Choose a valid report reason." });
    return;
  }
  const [question] = await db.select({ id: communityQuestionsTable.id }).from(communityQuestionsTable).where(eq(communityQuestionsTable.id, questionId)).limit(1);
  if (!question) { res.status(404).json({ error: "Question not found." }); return; }
  await db.insert(communityReportsTable).values({ targetType: "question", targetId: questionId, reporterId: userId, reason });
  await db.update(communityQuestionsTable).set({ status: "pending", updatedAt: new Date() }).where(eq(communityQuestionsTable.id, questionId));
  res.status(201).json({ ok: true });
});

function adminAuthorized(req: Request): boolean {
  return Boolean(process.env.SESSION_SECRET && req.headers["x-admin-secret"] === process.env.SESSION_SECRET);
}

router.get("/admin/community/questions", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  if (!adminAuthorized(req)) { res.status(401).json({ error: "Not authorized" }); return; }
  const status = typeof req.query.status === "string" ? req.query.status : "pending";
  const rows = await db.select().from(communityQuestionsTable).where(eq(communityQuestionsTable.status, status)).orderBy(desc(communityQuestionsTable.createdAt)).limit(200);
  res.json(rows);
});

router.post("/admin/community/questions/:id/status", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  if (!adminAuthorized(req)) { res.status(401).json({ error: "Not authorized" }); return; }
  const status = ["published", "rejected", "pending"].includes(req.body?.status) ? req.body.status : null;
  const id = Number(req.params.id);
  if (!status || !Number.isInteger(id)) { res.status(400).json({ error: "Invalid moderation update." }); return; }
  const [updated] = await db.update(communityQuestionsTable).set({ status, updatedAt: new Date() }).where(eq(communityQuestionsTable.id, id)).returning({ id: communityQuestionsTable.id, status: communityQuestionsTable.status });
  if (!updated) { res.status(404).json({ error: "Question not found." }); return; }
  res.json(updated);
});

router.get("/admin/community/reports", async (req, res): Promise<void> => {
  if (!adminAuthorized(req)) { res.status(401).json({ error: "Not authorized" }); return; }
  const rows = await db.select({ report: communityReportsTable, question: communityQuestionsTable })
    .from(communityReportsTable).innerJoin(communityQuestionsTable, eq(communityReportsTable.targetId, communityQuestionsTable.id))
    .where(eq(communityReportsTable.status, "pending")).orderBy(desc(communityReportsTable.createdAt)).limit(200);
  res.json(rows);
});

router.post("/admin/community/reports/:id/status", async (req, res): Promise<void> => {
  if (!adminAuthorized(req)) { res.status(401).json({ error: "Not authorized" }); return; }
  const status = ["resolved", "dismissed", "pending"].includes(req.body?.status) ? req.body.status : null;
  const id = Number(req.params.id);
  if (!status || !Number.isInteger(id)) { res.status(400).json({ error: "Invalid report update." }); return; }
  const [updated] = await db.update(communityReportsTable).set({ status }).where(eq(communityReportsTable.id, id)).returning({ id: communityReportsTable.id, status: communityReportsTable.status });
  if (!updated) { res.status(404).json({ error: "Report not found." }); return; }
  res.json(updated);
});

export default router;