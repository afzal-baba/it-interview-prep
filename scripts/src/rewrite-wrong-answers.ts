/**
 * Batch-rewrites wrong answers for questions where the correct answer is
 * significantly longer/more detailed than the wrong options, making it trivially
 * easy to guess the right answer without reading the question.
 *
 * Strategy: for each affected question, ask GPT to rewrite the 3 wrong answers
 * so they are similarly detailed and similarly long to the correct answer, while
 * remaining clearly incorrect.
 *
 * Usage: pnpm --filter @workspace/scripts tsx src/rewrite-wrong-answers.ts
 */

import OpenAI from "openai";
import { db, questionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import pLimit from "p-limit";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const MIN_CORRECT_ADVANTAGE = 25; // only rewrite when correct is >25 chars longer than the best wrong answer
const BATCH_SIZE = 8;            // questions per GPT call
const CONCURRENCY = 6;           // parallel GPT calls
const DELAY_MS = 200;            // ms between batches to avoid rate limits

type QuestionRow = {
  id: number;
  text: string;
  options: string[];
  correctOptionIndex: number;
};

interface RewriteResult {
  id: number;
  wrong1: string;
  wrong2: string;
  wrong3: string;
}

function getWrongOptions(row: QuestionRow): string[] {
  return row.options.filter((_, i) => i !== row.correctOptionIndex);
}

function correctAnswer(row: QuestionRow): string {
  return row.options[row.correctOptionIndex];
}

function needsRewrite(row: QuestionRow): boolean {
  const cl = correctAnswer(row).length;
  const wrongs = getWrongOptions(row);
  const maxWrong = Math.max(...wrongs.map((w) => w.length));
  return cl - maxWrong > MIN_CORRECT_ADVANTAGE;
}

async function rewriteBatch(batch: QuestionRow[]): Promise<RewriteResult[]> {
  const payload = batch.map((q) => ({
    id: q.id,
    question: q.text,
    correct: correctAnswer(q),
    wrong: getWrongOptions(q),
  }));

  const prompt = `You are improving a technical quiz. For each question below, the correct answer is significantly longer and more detailed than the wrong answers, making it easy to guess without reading. Rewrite the 3 wrong answers so they:
- Are similar in length and detail to the correct answer (within ~20% of its character count)
- Sound plausible and specific — not obviously silly
- Remain clearly incorrect for someone who knows the topic
- Preserve the same general "format" (if correct starts with a phrase like "A method that...", wrong answers should too)
- Do NOT include the question number or any labels in the answer text

Return ONLY a JSON array (no markdown, no explanation) in this exact shape:
[{"id": <number>, "wrong1": "...", "wrong2": "...", "wrong3": "..."}]

Questions:
${JSON.stringify(payload, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "[]";
  // Strip possible markdown code fences
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as RewriteResult[];
}

async function applyRewrite(row: QuestionRow, rewrite: RewriteResult): Promise<void> {
  const newOptions = [...row.options];
  const wrongs = getWrongOptions(row);
  const wrongIndices = row.options
    .map((_, i) => i)
    .filter((i) => i !== row.correctOptionIndex);

  // Place rewritten wrong answers back at their original indices
  newOptions[wrongIndices[0]] = rewrite.wrong1;
  newOptions[wrongIndices[1]] = rewrite.wrong2;
  newOptions[wrongIndices[2]] = rewrite.wrong3;

  await db
    .update(questionsTable)
    .set({ options: newOptions })
    .where(eq(questionsTable.id, row.id));
}

async function main() {
  console.log("Loading questions from DB…");
  const allQuestions = await db.select().from(questionsTable);
  const affected = allQuestions.filter(needsRewrite) as QuestionRow[];
  console.log(`Found ${affected.length} / ${allQuestions.length} questions that need rewriting`);

  if (affected.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Split into batches
  const batches: QuestionRow[][] = [];
  for (let i = 0; i < affected.length; i += BATCH_SIZE) {
    batches.push(affected.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${batches.length} batches of ≤${BATCH_SIZE} (concurrency=${CONCURRENCY})…\n`);

  const limit = pLimit(CONCURRENCY);
  let done = 0;
  let errors = 0;

  await Promise.all(
    batches.map((batch, bi) =>
      limit(async () => {
        // Stagger to avoid rate limit spikes
        await new Promise((r) => setTimeout(r, bi * DELAY_MS));

        try {
          const rewrites = await rewriteBatch(batch);

          for (const rewrite of rewrites) {
            const row = batch.find((q) => q.id === rewrite.id);
            if (!row) continue;
            await applyRewrite(row, rewrite);
          }

          done += batch.length;
          const pct = ((done / affected.length) * 100).toFixed(1);
          process.stdout.write(`\r  ✓ ${done} / ${affected.length} (${pct}%)   `);
        } catch (err) {
          errors += batch.length;
          console.error(`\n  ✗ Batch ${bi} failed:`, (err as Error).message);
        }
      })
    )
  );

  console.log(`\n\nDone. Updated: ${done}, Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
