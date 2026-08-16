import { Router, type IRouter } from "express";
import { db, searchLogsTable } from "@workspace/db";
import { sql, desc, count, eq } from "drizzle-orm";

const router: IRouter = Router();

// POST /api/search-log
// Called fire-and-forget from the frontend whenever the search query settles.
router.post("/search-log", async (req, res): Promise<void> => {
  const { query, resultCount } = req.body ?? {};
  if (typeof query !== "string" || typeof resultCount !== "number") {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const normalized = query.trim().toLowerCase().slice(0, 200);
  if (!normalized) { res.status(204).end(); return; }

  await db.insert(searchLogsTable).values({ query: normalized, resultCount });
  res.status(204).end();
});

// GET /api/search-insights
// Returns aggregated search data: top queries, zero-result queries (gap signals).
router.get("/search-insights", async (_req, res): Promise<void> => {
  // Top 30 searched terms overall
  const topSearches = await db
    .select({
      query: searchLogsTable.query,
      searches: count(searchLogsTable.id),
      zeroResults: sql<number>`sum(case when ${searchLogsTable.resultCount} = 0 then 1 else 0 end)::int`,
    })
    .from(searchLogsTable)
    .groupBy(searchLogsTable.query)
    .orderBy(desc(count(searchLogsTable.id)))
    .limit(30);

  // Missing topics: queries that never returned a result (high demand, no supply)
  const missingTopics = await db
    .select({
      query: searchLogsTable.query,
      searches: count(searchLogsTable.id),
    })
    .from(searchLogsTable)
    .where(eq(searchLogsTable.resultCount, 0))
    .groupBy(searchLogsTable.query)
    .orderBy(desc(count(searchLogsTable.id)))
    .limit(20);

  // Total searches logged
  const [{ total }] = await db
    .select({ total: count(searchLogsTable.id) })
    .from(searchLogsTable);

  res.json({ total, topSearches, missingTopics });
});

export default router;
