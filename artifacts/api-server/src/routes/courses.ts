import { Router, type IRouter } from "express";
import { eq, and, sql, notInArray } from "drizzle-orm";
import { db, coursesTable, questionsTable } from "@workspace/db";
import {
  ListCoursesResponse,
  ListQuestionsParams,
  ListQuestionsQueryParams,
  ListQuestionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const ROTATION_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 90;

function rotationCookieName(courseId: number, level: string) {
  return `quiz_rotation_${courseId}_${level}`;
}

function parseRotationHistory(value: unknown): number[][] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((rotation): rotation is unknown[] => Array.isArray(rotation))
      .map((rotation) =>
        rotation.filter(
          (id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0,
        ),
      )
      .slice(-5);
  } catch {
    return [];
  }
}

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
    countMap[row.courseId][row.level as "beginner" | "intermediate" | "advanced"] = Math.min(row.count, 10);
  }

  const result = courses.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    category: c.category,
    questionCounts: countMap[c.id] ?? { beginner: 0, intermediate: 0, advanced: 0 },
  }));

  res.json(ListCoursesResponse.parse(result));
});

// GET /courses/:courseId/questions
router.get("/courses/:courseId/questions", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
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
  const { level, limit, excludeIds } = parsedQuery.data;
  const requestedLimit = Math.min(limit, 10);
  const queryExcludedQuestionIds = (excludeIds ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  const cookieName = rotationCookieName(courseId, level);
  const cookieRotations = parseRotationHistory(req.cookies?.[cookieName]);
  const excludedQuestionIds = [
    ...new Set([...queryExcludedQuestionIds, ...cookieRotations.flat()]),
  ];

  const course = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (course.length === 0) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  // Malformed legacy rows must never reach the response schema. Keep the
  // database-side filter here so a random selection cannot turn into a 500.
  const validOptions = sql`
    jsonb_typeof(${questionsTable.options}) = 'array'
    AND jsonb_array_length(${questionsTable.options}) = 4
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(${questionsTable.options}) AS option
      WHERE jsonb_typeof(option) <> 'string'
        OR btrim(option #>> '{}') = ''
    )
    AND ${questionsTable.correctOptionIndex} BETWEEN 0 AND 3
  `;
  const baseConditions = and(
    eq(questionsTable.courseId, courseId),
    eq(questionsTable.level, level),
    validOptions,
  );
  const freshQuestions = await db
    .select()
    .from(questionsTable)
    .where(
      excludedQuestionIds.length > 0
        ? and(baseConditions, notInArray(questionsTable.id, excludedQuestionIds))
        : baseConditions,
    )
    .orderBy(sql`random()`)
    .limit(requestedLimit);

  // If a pool is smaller than five rotations, fill the remainder from the
  // full pool rather than returning fewer than the quiz size. This is only
  // needed after all non-excluded questions have been used, so a second
  // attempt still receives a completely fresh rotation whenever possible.
  let questions = freshQuestions;
  if (questions.length < requestedLimit) {
    const selectedIds = questions.map((question) => question.id);
    const fallback = await db
      .select()
      .from(questionsTable)
      .where(
        selectedIds.length > 0
          ? and(baseConditions, notInArray(questionsTable.id, selectedIds))
          : baseConditions,
      )
      .orderBy(sql`random()`)
      .limit(requestedLimit - questions.length);
    questions = [...questions, ...fallback];
  }

  const result = questions.map((q) => ({
    id: q.id,
    courseId: q.courseId,
    level: q.level,
    text: q.text,
    options: q.options as string[],
    correctOptionIndex: q.correctOptionIndex,
    explanation: q.explanation ?? null,
  }));

  // Keep a server-side browser cookie as a reliable backup for the client
  // localStorage history. This protects rotation behavior when localStorage is
  // unavailable or the user starts another quiz before React finishes writing.
  const updatedRotations = [
    ...cookieRotations,
    questions.map((question) => question.id),
  ].slice(-5);
  res.cookie(cookieName, JSON.stringify(updatedRotations), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ROTATION_COOKIE_MAX_AGE_MS,
    path: "/",
  });

  res.json(ListQuestionsResponse.parse(result));
});

export default router;
