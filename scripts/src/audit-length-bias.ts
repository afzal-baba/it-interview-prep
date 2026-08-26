import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { db, coursesTable, questionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type AuditQuestion = {
  id: number;
  tech: string;
  level: string;
  text: string;
  options: unknown;
  correctOptionIndex: number;
};

type ValidQuestion = AuditQuestion & { options: string[]; lengths: number[] };

function isValidQuestion(question: AuditQuestion): question is ValidQuestion {
  return (
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every((option) => typeof option === "string" && option.trim().length > 0) &&
    Number.isInteger(question.correctOptionIndex) &&
    question.correctOptionIndex >= 0 &&
    question.correctOptionIndex < 4
  );
}

function metrics(question: ValidQuestion) {
  const lengths = question.lengths;
  const correctLength = lengths[question.correctOptionIndex];
  const max = Math.max(...lengths);
  const min = Math.min(...lengths);
  const maxWrong = Math.max(...lengths.filter((_, index) => index !== question.correctOptionIndex));
  const ratio = min === 0 ? Number.POSITIVE_INFINITY : max / min;
  const correctIsLongest = correctLength === max;
  const biased = correctIsLongest && (max - min > 20 || ratio > 1.5);
  return { lengths, correctLength, max, min, maxWrong, ratio, correctIsLongest, biased };
}

async function main() {
  const reportPath = process.env.AUDIT_REPORT_PATH ?? "audit-report.json";
  const backupPath = process.env.QUESTION_BACKUP_PATH ?? "questions.backup.json";
  const rows = (await db
    .select({
      id: questionsTable.id,
      tech: coursesTable.slug,
      level: questionsTable.level,
      text: questionsTable.text,
      options: questionsTable.options,
      correctOptionIndex: questionsTable.correctOptionIndex,
    })
    .from(questionsTable)
    .innerJoin(coursesTable, eq(questionsTable.courseId, coursesTable.id))) as unknown as AuditQuestion[];

  const valid = rows.filter(isValidQuestion).map((question) => ({
    ...question,
    options: question.options as string[],
    lengths: (question.options as string[]).map((option) => option.length),
  }));
  const invalid = rows.filter((question) => !isValidQuestion(question));
  const measured = valid.map((question) => ({ question, ...metrics(question) }));
  const biased = measured.filter((entry) => entry.biased);
  const strictViolations = measured.filter(
    (entry) => entry.max - entry.min > 12 || entry.lengths.some((length) => length < 28 || length > 50),
  );
  let originalById = new Map<number, string[]>();
  try {
    const backup = JSON.parse(await readFile(backupPath, "utf8")) as Array<{ id: number; options: unknown }>;
    originalById = new Map(
      backup
        .filter((row) => Array.isArray(row.options) && row.options.every((option) => typeof option === "string"))
        .map((row) => [row.id, row.options as string[]]),
    );
  } catch {
    // The report remains useful without a backup; the rewrite script creates one.
  }

  const byTechnology: Record<string, {
    total: number;
    biased: number;
    biasedPct: number;
    strictViolations: number;
    levels: Record<string, { total: number; biased: number; strictViolations: number }>;
  }> = {};

  for (const entry of measured) {
    const tech = byTechnology[entry.question.tech] ?? {
      total: 0,
      biased: 0,
      biasedPct: 0,
      strictViolations: 0,
      levels: {},
    };
    tech.total += 1;
    tech.biased += entry.biased ? 1 : 0;
    tech.strictViolations += entry.max - entry.min > 12 || entry.lengths.some((length) => length < 28 || length > 50) ? 1 : 0;
    const level = tech.levels[entry.question.level] ?? { total: 0, biased: 0, strictViolations: 0 };
    level.total += 1;
    level.biased += entry.biased ? 1 : 0;
    level.strictViolations += entry.max - entry.min > 12 || entry.lengths.some((length) => length < 28 || length > 50) ? 1 : 0;
    tech.levels[entry.question.level] = level;
    tech.biasedPct = Number(((tech.biased / tech.total) * 100).toFixed(2));
    byTechnology[entry.question.tech] = tech;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    tech: "all",
    total: valid.length,
    biased: biased.length,
    biasedPct: Number(((biased.length / Math.max(valid.length, 1)) * 100).toFixed(2)),
    strictViolations: strictViolations.length,
    strictReviewNote: "Strict 28-50 character normalization is reported for review; technically meaningful short answers are not mechanically padded.",
    invalid: {
      total: invalid.length,
      ids: invalid.map((question) => question.id),
    },
    worstExamples: biased
      .sort((a, b) => (b.correctLength - b.maxWrong) - (a.correctLength - a.maxWrong))
      .slice(0, 5)
      .map(({ question, lengths, correctLength, maxWrong, ratio }) => ({
        id: question.id,
        tech: question.tech,
        level: question.level,
        question: question.text,
        options: question.options,
        lengths,
        correctOptionIndex: question.correctOptionIndex,
        correctLength,
        longestWrongLength: maxWrong,
        correctAdvantage: correctLength - maxWrong,
        maxMinRatio: Number(ratio.toFixed(2)),
      })),
    examplesByTechnology: Object.fromEntries(
      ["git", "docker-k8s", "python", "aws", "react", "kubernetes-adv", "typescript", "sql", "java"]
        .map((tech) => [
          tech,
          measured
            .filter((entry) => entry.question.tech === tech)
            .slice(0, 3)
            .map(({ question, lengths }) => ({
              id: question.id,
              level: question.level,
              question: question.text,
              beforeOptions: originalById.get(question.id) ?? null,
              afterOptions: question.options,
              beforeLengths: originalById.get(question.id)?.map((option) => option.length) ?? null,
              afterLengths: lengths,
            })),
        ]),
    ),
    byTechnology,
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.table([
    { scope: "all", total: report.total, biased: report.biased, biasedPct: report.biasedPct, strictViolations: report.strictViolations, invalid: report.invalid.total },
    ...Object.entries(byTechnology)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tech, value]) => ({ scope: tech, total: value.total, biased: value.biased, biasedPct: value.biasedPct, strictViolations: value.strictViolations })),
  ]);
  for (const [tech, examples] of Object.entries(report.examplesByTechnology)) {
    for (const example of examples) {
      console.log(`${tech} #${example.id}: before=${JSON.stringify(example.beforeLengths)} after=${JSON.stringify(example.afterLengths)}`);
    }
  }
  console.log(`Wrote ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});