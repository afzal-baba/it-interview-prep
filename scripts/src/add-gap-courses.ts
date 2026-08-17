/**
 * Adds gap courses identified from zero-result production searches.
 * Safe to re-run — skips courses/levels already in the DB.
 *
 * Usage: pnpm --filter @workspace/scripts tsx src/add-gap-courses.ts
 */

import OpenAI from "openai";
import { db, coursesTable, questionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import pLimit from "p-limit";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const CONCURRENCY = 5;
const LEVELS = ["beginner", "intermediate", "advanced"] as const;

const GAP_COURSES = [
  {
    name: ".NET & C#",
    slug: "dotnet-csharp",
    category: "Languages",
    description:
      "Master C# and the .NET ecosystem: CLR, async/await, LINQ, generics, ASP.NET Core, Entity Framework, dependency injection, and enterprise patterns used in production .NET applications.",
    icon: "💜",
  },
  {
    name: "Adobe Experience Manager",
    slug: "aem",
    category: "CMS & Platforms",
    description:
      "Build and manage enterprise digital experiences with Adobe Experience Manager: content authoring, component development, OSGi, Sling, JCR, workflows, and AEM as a Cloud Service architecture.",
    icon: "🎨",
  },
] as const;

interface GeneratedQuestion {
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

async function generateQuestions(
  courseName: string,
  level: string
): Promise<GeneratedQuestion[]> {
  const levelDesc =
    level === "beginner"
      ? "fundamental concepts, definitions, and basic usage — no deep experience assumed"
      : level === "intermediate"
        ? "practical patterns, common pitfalls, configuration, and real-world usage"
        : "advanced internals, architecture decisions, performance optimisation, and expert-level tradeoffs";

  const prompt = `Generate 10 multiple-choice quiz questions for a technical interview prep platform on: "${courseName}".

Difficulty: ${level} — focus on ${levelDesc}.

CRITICAL requirements:
- Each question has exactly 4 options
- Exactly one is correct
- ALL 4 options must be SIMILAR IN LENGTH and detail (within 20% of each other's character count) — users must not be able to guess by length
- Wrong options sound plausible and specific, not obviously silly
- Include a 1-2 sentence explanation for why the correct answer is right
- Vary question types: definitions, "what happens when", best practices, comparisons, "which is correct"

Return ONLY a JSON array (no markdown):
[{"text":"...","options":["A","B","C","D"],"correctOptionIndex":0,"explanation":"..."}]`;

  const resp = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = resp.choices[0]?.message?.content ?? "[]";
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return (JSON.parse(cleaned) as GeneratedQuestion[]).slice(0, 10);
}

async function main() {
  console.log(`\n🚀 Adding ${GAP_COURSES.length} gap courses...\n`);

  // Step 1 — Insert courses (skip existing by slug)
  const courseIds: Array<{ id: number; name: string }> = [];
  for (const c of GAP_COURSES) {
    const existing = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.slug, c.slug))
      .limit(1);
    if (existing.length > 0) {
      console.log(`  ⏭  Already exists: ${c.name}`);
      courseIds.push({ id: existing[0].id, name: existing[0].name });
    } else {
      const [row] = await db
        .insert(coursesTable)
        .values({
          name: c.name,
          slug: c.slug,
          category: c.category,
          description: c.description,
          icon: c.icon,
        })
        .returning({ id: coursesTable.id, name: coursesTable.name });
      console.log(`  ✅ Inserted: ${c.name} (id=${row.id})`);
      courseIds.push(row);
    }
  }

  // Step 2 — Generate questions for each course × level in parallel
  console.log(
    `\n📝 Generating questions (${courseIds.length} courses × 3 levels × 10 questions)...\n`
  );
  const limit = pLimit(CONCURRENCY);

  const jobs = courseIds.flatMap((course) =>
    LEVELS.map((level) =>
      limit(async () => {
        const existing = await db
          .select({ id: questionsTable.id })
          .from(questionsTable)
          .where(
            and(
              eq(questionsTable.courseId, course.id),
              eq(questionsTable.level, level)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          console.log(`  ⏭  ${course.name} [${level}] — already has questions`);
          return;
        }

        console.log(`  🤖 ${course.name} [${level}]...`);
        try {
          const questions = await generateQuestions(course.name, level);
          await db.insert(questionsTable).values(
            questions.map((q) => ({
              courseId: course.id,
              level,
              text: q.text,
              options: q.options,
              correctOptionIndex: q.correctOptionIndex,
              explanation: q.explanation,
            }))
          );
          console.log(
            `  ✅ ${course.name} [${level}] — ${questions.length} questions`
          );
        } catch (err) {
          console.error(
            `  ❌ ${course.name} [${level}] failed:`,
            (err as Error).message
          );
        }
      })
    )
  );

  await Promise.all(jobs);

  const [{ total }] = await db.execute<{ total: string }>({
    sql: "SELECT COUNT(*) as total FROM questions",
    params: [],
  });
  const [{ courses }] = await db.execute<{ courses: string }>({
    sql: "SELECT COUNT(*) as courses FROM courses",
    params: [],
  });
  console.log(
    `\n🎉 Done! Total courses: ${courses}, Total questions: ${total}\n`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
