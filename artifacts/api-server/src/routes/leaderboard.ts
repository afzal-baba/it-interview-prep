import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, leaderboardTable, coursesTable, sessionsTable } from "@workspace/db";
import {
  ListLeaderboardQueryParams,
  ListLeaderboardResponse,
  CreateLeaderboardEntryBody,
  CreateLeaderboardEntryResponse,
  GetLeaderboardStatsResponse,
  ListMyScoresResponse,
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

  const { courseId, level, timedMode, limit } = parsed.data;

  const conditions = [];
  if (courseId != null) conditions.push(eq(leaderboardTable.courseId, courseId));
  if (level != null) conditions.push(eq(leaderboardTable.level, level));
  if (timedMode != null) conditions.push(eq(leaderboardTable.timedMode, timedMode));

  const rows = await db
    .select({
      id: leaderboardTable.id,
      playerName: leaderboardTable.playerName,
      userId: leaderboardTable.userId,
      courseId: leaderboardTable.courseId,
      courseName: coursesTable.name,
      level: leaderboardTable.level,
      score: leaderboardTable.score,
      totalQuestions: leaderboardTable.totalQuestions,
      percentage: leaderboardTable.percentage,
      badges: leaderboardTable.badges,
      timedMode: leaderboardTable.timedMode,
      timeBonus: leaderboardTable.timeBonus,
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
// Accepts sessionId + playerName; all score data is derived server-side from the session record
router.post("/leaderboard", async (req, res): Promise<void> => {
  const parsed = CreateLeaderboardEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionId, playerName } = parsed.data;

  // Attach the authenticated user's id (if logged in) so scores are tied to accounts
  const userId = req.isAuthenticated() ? req.user.id : null;

  // Look up the completed session to get server-computed results
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (sessions.length === 0) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const session = sessions[0];

  if (!session.completedAt) {
    res.status(400).json({ error: "Session has not been completed yet" });
    return;
  }

  // All score/mode/bonus values come from the server-computed session record
  const score = session.score ?? 0;
  const timeBonus = session.timeBonus ?? 0;
  const timedMode = session.timedMode;
  const percentage = session.percentage ?? 0;
  const totalQuestions = session.totalQuestions ?? 0;
  const badges = computeBadges(percentage);

  const [entry] = await db
    .insert(leaderboardTable)
    .values({
      playerName,
      userId,
      courseId: session.courseId,
      level: session.level,
      score,
      totalQuestions,
      percentage,
      badges,
      timedMode,
      timeBonus,
      sessionId: session.id,
    })
    .returning();

  const course = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, entry.courseId))
    .limit(1);

  res.status(201).json(CreateLeaderboardEntryResponse.parse({
    id: entry.id,
    playerName: entry.playerName,
    userId: entry.userId,
    courseId: entry.courseId,
    courseName: course[0]?.name ?? "",
    level: entry.level,
    score: entry.score,
    totalQuestions: entry.totalQuestions,
    percentage: entry.percentage,
    badges: (entry.badges as string[]) ?? [],
    timedMode: entry.timedMode,
    timeBonus: entry.timeBonus,
    createdAt: entry.createdAt,
  }));
});

// GET /me/scores — personal score history for the authenticated user
router.get("/me/scores", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const rows = await db
    .select({
      id: leaderboardTable.id,
      playerName: leaderboardTable.playerName,
      userId: leaderboardTable.userId,
      courseId: leaderboardTable.courseId,
      courseName: coursesTable.name,
      level: leaderboardTable.level,
      score: leaderboardTable.score,
      totalQuestions: leaderboardTable.totalQuestions,
      percentage: leaderboardTable.percentage,
      badges: leaderboardTable.badges,
      timedMode: leaderboardTable.timedMode,
      timeBonus: leaderboardTable.timeBonus,
      createdAt: leaderboardTable.createdAt,
    })
    .from(leaderboardTable)
    .innerJoin(coursesTable, eq(leaderboardTable.courseId, coursesTable.id))
    .where(eq(leaderboardTable.userId, req.user.id))
    .orderBy(desc(leaderboardTable.createdAt));

  res.json(ListMyScoresResponse.parse(
    rows.map((r) => ({ ...r, badges: (r.badges as string[]) ?? [] })),
  ));
});

export default router;
