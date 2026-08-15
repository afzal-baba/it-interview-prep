import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable, questionsTable } from "@workspace/db";
import {
  CreateSessionBody,
  CreateSessionResponse,
  SubmitSessionParams,
  SubmitSessionBody,
  SubmitSessionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function computeBadges(percentage: number): string[] {
  const badges: string[] = [];
  if (percentage >= 50) badges.push("Bronze");
  if (percentage >= 70) badges.push("Silver");
  if (percentage >= 85) badges.push("Gold");
  if (percentage >= 95) badges.push("Platinum");
  return badges;
}

// POST /sessions
router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courseId, level } = parsed.data;

  const [session] = await db
    .insert(sessionsTable)
    .values({ courseId, level })
    .returning();

  res.status(201).json(CreateSessionResponse.parse({
    id: session.id,
    courseId: session.courseId,
    level: session.level,
    startedAt: session.startedAt,
  }));
});

// POST /sessions/:sessionId/submit
router.post("/sessions/:sessionId/submit", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const parsedParams = SubmitSessionParams.safeParse({ sessionId: rawId });
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid sessionId" });
    return;
  }

  const parsedBody = SubmitSessionBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const { sessionId } = parsedParams.data;
  const { answers } = parsedBody.data;

  const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
  if (sessions.length === 0) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Fetch the questions referenced in the answers
  const questionIds = answers.map((a) => a.questionId);
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, questionIds[0])); // fallback — we'll do it properly below

  // Fetch all referenced questions
  const allQuestions = await db.select().from(questionsTable);
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

  let correctCount = 0;
  const questionResults = answers.map((a) => {
    const q = questionMap.get(a.questionId);
    const isCorrect = q ? q.correctOptionIndex === a.selectedOptionIndex : false;
    if (isCorrect) correctCount++;
    return {
      questionId: a.questionId,
      selectedOptionIndex: a.selectedOptionIndex,
      correctOptionIndex: q?.correctOptionIndex ?? 0,
      isCorrect,
      explanation: q?.explanation ?? null,
    };
  });

  const totalQuestions = answers.length;
  const score = correctCount * 10;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const badges = computeBadges(percentage);

  // Mark session as completed
  await db
    .update(sessionsTable)
    .set({ completedAt: new Date() })
    .where(eq(sessionsTable.id, sessionId));

  res.json(SubmitSessionResponse.parse({
    sessionId,
    score,
    totalQuestions,
    correctCount,
    percentage,
    badges,
    questionResults,
  }));
});

export default router;
