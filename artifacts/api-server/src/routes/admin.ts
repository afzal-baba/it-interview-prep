/**
 * One-time admin endpoint to rewrite quiz wrong answers in production.
 * Protected by SESSION_SECRET header. Runs in background; returns immediately.
 * Remove after production data is fixed.
 */
import { Router, type IRouter } from "express";
import { db, questionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function needsRewrite(options: string[], correctIdx: number): boolean {
  const correctLen = options[correctIdx]?.length ?? 0;
  const wrongLens = options.filter((_, i) => i !== correctIdx).map((o) => o.length);
  const maxWrong = Math.max(...wrongLens);
  return correctLen - maxWrong > 25;
}

router.post("/admin/rewrite-answers", async (req, res): Promise<void> => {
  const auth = req.headers["x-admin-secret"];
  const SECRET = process.env.SESSION_SECRET;

  if (!SECRET || auth !== SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const OPENAI_BASE = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const OPENAI_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (!OPENAI_BASE || !OPENAI_KEY) {
    res.status(500).json({ error: "OpenAI env vars not set" });
    return;
  }

  const allQuestions = await db.select().from(questionsTable);
  const affected = allQuestions.filter((q) =>
    needsRewrite(q.options as string[], q.correctOptionIndex)
  );

  res.json({
    message: `Rewriting ${affected.length} of ${allQuestions.length} questions in the background`,
    affected: affected.length,
    total: allQuestions.length,
  });

  // Run in background after response is sent
  (async () => {
    const BATCH = 8;
    let done = 0;
    let errors = 0;

    for (let i = 0; i < affected.length; i += BATCH) {
      const batch = affected.slice(i, i + BATCH);
      try {
        const payload = batch.map((q) => ({
          id: q.id,
          question: q.text,
          correct: (q.options as string[])[q.correctOptionIndex],
          wrong: (q.options as string[]).filter((_, idx) => idx !== q.correctOptionIndex),
        }));

        const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-5.6-luna",
            max_completion_tokens: 4096,
            messages: [
              {
                role: "user",
                content: `You are improving a technical quiz. For each question below, the correct answer is significantly longer and more detailed than the wrong answers, making it trivially easy to guess without reading. Rewrite the 3 wrong answers so they:
- Are similar in length and detail to the correct answer (within ~20% of its character count)
- Sound plausible and specific — not obviously silly
- Remain clearly incorrect for someone who knows the topic
- Preserve the same general format as the correct answer
Return ONLY a JSON array (no markdown): [{"id": <number>, "wrong1": "...", "wrong2": "...", "wrong3": "..."}]

Questions:
${JSON.stringify(payload, null, 2)}`,
              },
            ],
          }),
        });

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = data.choices?.[0]?.message?.content ?? "[]";
        const cleaned = raw
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const rewrites: Array<{
          id: number;
          wrong1: string;
          wrong2: string;
          wrong3: string;
        }> = JSON.parse(cleaned);

        for (const rewrite of rewrites) {
          const q = batch.find((b) => b.id === rewrite.id);
          if (!q) continue;
          const opts = [...(q.options as string[])];
          const wrongIdxs = [0, 1, 2, 3].filter(
            (i) => i !== q.correctOptionIndex
          );
          opts[wrongIdxs[0]] = rewrite.wrong1;
          opts[wrongIdxs[1]] = rewrite.wrong2;
          opts[wrongIdxs[2]] = rewrite.wrong3;
          await db
            .update(questionsTable)
            .set({ options: opts })
            .where(eq(questionsTable.id, q.id));
        }
        done += batch.length;
      } catch (e) {
        errors += batch.length;
        console.error(`Admin rewrite batch ${i} failed:`, e);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log(`[admin/rewrite-answers] Done: ${done}, Errors: ${errors}`);
  })();
});

export default router;
