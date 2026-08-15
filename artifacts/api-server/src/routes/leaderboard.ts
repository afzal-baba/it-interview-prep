import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, leaderboardTable, coursesTable } from "@workspace/db";
import {
  ListLeaderboardQueryParams,
  ListLeaderboardResponse,
  CreateLeaderboardEntryBody,
  CreateLeaderboardEntryResponse,
  GetLeaderboardStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /leaderboard/stats  — must come before /leaderboard to avoid param capture
router.get("/leaderboard/stats", async (req, res): Promise<void> => {
  const totalRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leaderboardTable);
  const totalAttempts = totalRow[0]?.count ?? 0;

  const avgRow = await db
    .select({ avg: sql<number>`round(avg(percentage))::int` })
    .from(leaderboardTable);
  const avgPercentage = avgRow[0]?.avg ?? 0;

  const topRow = await db
    .select({
      score: leaderboardTable.score,
      playerName: leaderboardTable.playerName,
    })
    .from(leaderboardTable)
    .orderBy(desc(leaderboardTable.percentage), desc(leaderboardTable.score))
    .limit(1);

  const topScore = topRow[0]?.score ?? 0;
  const topScorer = topRow[0]?.playerName ?? null;

  // Badge counts
  const badgeRows = await db.select({ badges: leaderboardTable.badges }).from(leaderboardTable);
  const badgeCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  for (const row of badgeRows) {
    const badges = (row.badges as string[]) ?? [];
    if (badges.includes("Bronze")) badgeCounts.bronze++;
    if (badges.includes("Silver")) badgeCounts.silver++;
    if (badges.includes("Gold")) badgeCounts.gold++;
    if (badges.includes("Platinum")) badgeCounts.platinum++;
  }

  res.json(GetLeaderboardStatsResponse.parse({
    totalAttempts,
    avgPercentage,
    topScore,
    topScorer,
    badgeCounts,
  }));
});

// GET /leaderboard
router.get("/leaderboard", async (req, res): Promise<void> => {
  const parsed = ListLeaderboardQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courseId, level, limit } = parsed.data;

  const conditions = [];
  if (courseId != null) conditions.push(eq(leaderboardTable.courseId, courseId));
  if (level != null) conditions.push(eq(leaderboardTable.level, level));

  const rows = await db
    .select({
      id: leaderboardTable.id,
      playerName: leaderboardTable.playerName,
      courseId: leaderboardTable.courseId,
      courseName: coursesTable.name,
      level: leaderboardTable.level,
      score: leaderboardTable.score,
      totalQuestions: leaderboardTable.totalQuestions,
      percentage: leaderboardTable.percentage,
      badges: leaderboardTable.badges,
      createdAt: leaderboardTable.createdAt,
    })
    .from(leaderboardTable)
    .innerJoin(coursesTable, eq(leaderboardTable.courseId, coursesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leaderboardTable.percentage), desc(leaderboardTable.score))
    .limit(limit);

  const result = rows.map((r) => ({
    ...r,
    badges: (r.badges as string[]) ?? [],
  }));

  res.json(ListLeaderboardResponse.parse(result));
});

// POST /leaderboard
router.post("/leaderboard", async (req, res): Promise<void> => {
  const parsed = CreateLeaderboardEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { playerName, courseId, level, score, totalQuestions, percentage, badges } = parsed.data;

  const [entry] = await db
    .insert(leaderboardTable)
    .values({ playerName, courseId, level, score, totalQuestions, percentage: Math.round(percentage), badges })
    .returning();

  const course = await db.select().from(coursesTable).where(eq(coursesTable.id, entry.courseId)).limit(1);

  res.status(201).json(CreateLeaderboardEntryResponse.parse({
    id: entry.id,
    playerName: entry.playerName,
    courseId: entry.courseId,
    courseName: course[0]?.name ?? "",
    level: entry.level,
    score: entry.score,
    totalQuestions: entry.totalQuestions,
    percentage: entry.percentage,
    badges: (entry.badges as string[]) ?? [],
    createdAt: entry.createdAt,
  }));
});

export default router;
