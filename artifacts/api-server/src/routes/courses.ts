import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, coursesTable, questionsTable } from "@workspace/db";
import {
  ListCoursesResponse,
  ListQuestionsParams,
  ListQuestionsQueryParams,
  ListQuestionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /courses
router.get("/courses", async (req, res): Promise<void> => {
  // Disable caching so icon/content changes are always reflected immediately
  res.set("Cache-Control", "no-store");

  const courses = await db.select().from(coursesTable).orderBy(coursesTable.id);

  // Get question counts per course per level
  const counts = await db
    .select({
      courseId: questionsTable.courseId,
      level: questionsTable.level,
      count: sql<number>`count(*)::int`,
    })
    .from(questionsTable)
    .groupBy(questionsTable.courseId, questionsTable.level);

  const countMap: Record<number, { beginner: number; intermediate: number; advanced: number }> = {};
  for (const row of counts) {
    if (!countMap[row.courseId]) {
      countMap[row.courseId] = { beginner: 0, intermediate: 0, advanced: 0 };
    }
    countMap[row.courseId][row.level as "beginner" | "intermediate" | "advanced"] = row.count;
  }

  const result = courses.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    questionCounts: countMap[c.id] ?? { beginner: 0, intermediate: 0, advanced: 0 },
  }));

  res.json(ListCoursesResponse.parse(result));
});

// GET /courses/:courseId/questions
router.get("/courses/:courseId/questions", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const parsedParams = ListQuestionsParams.safeParse({ courseId: rawId });
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid courseId" });
    return;
  }

  const parsedQuery = ListQuestionsQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const { courseId } = parsedParams.data;
  const { level, limit } = parsedQuery.data;

  const course = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (course.length === 0) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(and(eq(questionsTable.courseId, courseId), eq(questionsTable.level, level)))
    .orderBy(sql`random()`)
    .limit(limit);

  const result = questions.map((q) => ({
    id: q.id,
    courseId: q.courseId,
    level: q.level,
    text: q.text,
    options: q.options as string[],
    correctOptionIndex: q.correctOptionIndex,
    explanation: q.explanation ?? null,
  }));

  res.json(ListQuestionsResponse.parse(result));
});

export default router;
