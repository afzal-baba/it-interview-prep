import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, codelabScoresTable } from "@workspace/db";
import {
  SubmitCodelabScoreBody,
  SubmitCodelabScoreResponse,
  ListCodelabLeaderboardQueryParams,
  ListCodelabLeaderboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

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

  // Upsert: update if (playerName, techSlug) already exists, insert otherwise
  const existing = await db
    .select()
    .from(codelabScoresTable)
    .where(
      and(
        eq(codelabScoresTable.playerName, playerName),
        eq(codelabScoresTable.techSlug, techSlug)
      )
    )
    .limit(1);

  let entry;
  if (existing.length > 0) {
    const [updated] = await db
      .update(codelabScoresTable)
      .set({ points, techTitle, updatedAt: new Date() })
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
    })
  );
});

export default router;
