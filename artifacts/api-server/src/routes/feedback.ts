import { Router } from "express";
import { db, feedbackTable } from "@workspace/db";
import { desc, avg, count } from "drizzle-orm";

const router = Router();

// POST /feedback — submit a star rating + optional comment
router.post("/feedback", async (req, res) => {
  try {
    const { rating, comment } = req.body as { rating?: unknown; comment?: unknown };

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: "rating must be an integer 1–5" });
    }

    const trimmed = typeof comment === "string" ? comment.trim().slice(0, 1000) : null;

    const [row] = await db
      .insert(feedbackTable)
      .values({ rating: r, comment: trimmed || null })
      .returning({ id: feedbackTable.id });

    return res.status(201).json({ ok: true, id: row.id });
  } catch (err) {
    console.error("[feedback] POST error:", err);
    return res.status(500).json({ error: "Failed to save feedback" });
  }
});

// GET /feedback/summary — aggregate stats (public, for curiosity)
router.get("/feedback/summary", async (_req, res) => {
  try {
    const [row] = await db
      .select({ avgRating: avg(feedbackTable.rating), total: count(feedbackTable.id) })
      .from(feedbackTable);
    return res.json({ avgRating: row?.avgRating ?? null, total: row?.total ?? 0 });
  } catch (err) {
    console.error("[feedback] GET summary error:", err);
    return res.status(500).json({ error: "Failed to load summary" });
  }
});

export default router;
