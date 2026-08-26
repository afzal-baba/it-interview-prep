import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, codelabScoresTable, codelabProgressTable } from "@workspace/db";
import {
  SubmitCodelabScoreBody,
  SubmitCodelabScoreResponse,
  ListCodelabLeaderboardQueryParams,
  ListCodelabLeaderboardResponse,
  SaveCodelabProgressBody,
  GetCodelabProgressResponse,
  SaveCodelabProgressResponse,
} from "@workspace/api-zod";

const SESSION_COOKIE = "codelab_sid";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year

function getOrCreateSessionId(
  req: Parameters<Parameters<IRouter["get"]>[1]>[0],
  res: Parameters<Parameters<IRouter["get"]>[1]>[1],
): string {
  const existing = req.signedCookies?.[SESSION_COOKIE] as string | undefined;
  if (existing) return existing;
  const sid = randomUUID();
  res.cookie(SESSION_COOKIE, sid, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return sid;
}

const router: IRouter = Router();

// GET /codelab-progress
router.get("/codelab-progress", async (req, res): Promise<void> => {
  const sessionId = getOrCreateSessionId(req, res);

  const rows = await db
    .select({
      totalScore: codelabProgressTable.totalScore,
      completedSlugs: codelabProgressTable.completedSlugs,
    })
    .from(codelabProgressTable)
    .where(eq(codelabProgressTable.sessionId, sessionId))
    .limit(1);

  if (rows.length === 0) {
    res.json(GetCodelabProgressResponse.parse({ totalScore: 0, completedSlugs: [] }));
    return;
  }

  res.json(
    GetCodelabProgressResponse.parse({
      totalScore: rows[0].totalScore,
      completedSlugs: rows[0].completedSlugs,
    }),
  );
});

// POST /codelab-progress
router.post("/codelab-progress", async (req, res): Promise<void> => {
  const parsed = SaveCodelabProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sessionId = getOrCreateSessionId(req, res);
  const { totalScore, completedSlugs } = parsed.data;

  // Single atomic upsert:
  //  – GREATEST keeps the higher cumulative score (protects offline progress)
  //  – Array union merges completed-slug sets from both sides
  const [entry] = await db
    .insert(codelabProgressTable)
    .values({ sessionId, totalScore, completedSlugs })
    .onConflictDoUpdate({
      target: codelabProgressTable.sessionId,
      set: {
        totalScore: sql`GREATEST(${codelabProgressTable.totalScore}, EXCLUDED.total_score)`,
        completedSlugs: sql`(
          SELECT COALESCE(to_jsonb(array_agg(DISTINCT s)), '[]'::jsonb)
          FROM jsonb_array_elements_text(${codelabProgressTable.completedSlugs} || EXCLUDED.completed_slugs) AS t(s)
        )`,
        updatedAt: sql`NOW()`,
      },
    })
    .returning();

  res.json(
    SaveCodelabProgressResponse.parse({
      totalScore: entry.totalScore,
      completedSlugs: entry.completedSlugs,
    }),
  );
});

// GET /codelab-leaderboard
router.get("/codelab-leaderboard", async (req, res): Promise<void> => {
  const parsed = ListCodelabLeaderboardQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { limit } = parsed.data;

  const rows = await db
    .select({
      playerName: codelabScoresTable.playerName,
      totalPoints: sql<number>`sum(${codelabScoresTable.points})::int`,
      challengesCompleted: sql<number>`count(*)::int`,
    })
    .from(codelabScoresTable)
    .where(sql`${codelabScoresTable.points} > 0`)
    .groupBy(codelabScoresTable.playerName)
    .orderBy(desc(sql`sum(${codelabScoresTable.points})`))
    .limit(limit ?? 50);

  res.json(ListCodelabLeaderboardResponse.parse(rows));
});

// POST /codelab-scores
router.post("/codelab-scores", async (req, res): Promise<void> => {
  const parsed = SubmitCodelabScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { playerName, techSlug, techTitle, points } = parsed.data;

  // Preserve the best score for each player and challenge. A later retry or
  // lower re-submission must never replace a higher score already stored.
  const existing = await db
    .select()
    .from(codelabScoresTable)
    .where(
      and(
        eq(codelabScoresTable.playerName, playerName),
        eq(codelabScoresTable.techSlug, techSlug),
      ),
    )
    .limit(1);

  let entry;
  if (existing.length > 0) {
    const [updated] = await db
      .update(codelabScoresTable)
      .set({
        points: sql`GREATEST(${codelabScoresTable.points}, ${points})`,
        techTitle,
        updatedAt: sql`CASE WHEN ${points} > ${codelabScoresTable.points} THEN NOW() ELSE ${codelabScoresTable.updatedAt} END`,
      })
      .where(eq(codelabScoresTable.id, existing[0].id))
      .returning();
    entry = updated;
  } else {
    const [inserted] = await db
      .insert(codelabScoresTable)
      .values({ playerName, techSlug, techTitle, points })
      .returning();
    entry = inserted;
  }

  res.json(
    SubmitCodelabScoreResponse.parse({
      id: entry.id,
      playerName: entry.playerName,
      techSlug: entry.techSlug,
      techTitle: entry.techTitle,
      points: entry.points,
      updatedAt: entry.updatedAt,
    }),
  );
});

export default router;
