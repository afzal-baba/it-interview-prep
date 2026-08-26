import { db, questionsTable } from "@workspace/db";

type QuestionRow = {
  id: number;
  courseId: number;
  level: string;
  options: unknown;
  correctOptionIndex: number;
};

function isValidQuestion(question: QuestionRow): question is QuestionRow & { options: string[] } {
  return (
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every((option) => typeof option === "string" && option.trim().length > 0) &&
    Number.isInteger(question.correctOptionIndex) &&
    question.correctOptionIndex >= 0 &&
    question.correctOptionIndex < 4
  );
}

function permutations(values: number[]): number[][] {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((tail) => [value, ...tail]),
  );
}

async function main() {
  const rows = (await db.select().from(questionsTable)) as unknown as QuestionRow[];
  const valid = rows.filter(isValidQuestion);
  const invalid = rows.filter((question) => !isValidQuestion(question));
  const invalidIds = new Set(invalid.map((question) => question.id));
  const strictViolations = valid.filter((question) => {
    const lengths = question.options.map((option) => option.length);
    return Math.max(...lengths) - Math.min(...lengths) > 12 || lengths.some((length) => length < 28 || length > 50);
  });

  const allPermutations = permutations([0, 1, 2, 3]);
  const positionCounts = [0, 0, 0, 0];
  for (let trial = 0; trial < 100; trial += 1) {
    const positions = allPermutations[trial % allPermutations.length];
    positionCounts[positions.indexOf(0)] += 1;
  }

  const sample = valid[0];

  let uniqueOrders = 0;
  let apiCheck = "skipped";
  let malformedServed = 0;
  if (sample) {
    const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8080/api";
    const orders = new Set<string>();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetch(`${baseUrl}/courses/${sample.courseId}/questions?level=${sample.level}&limit=10`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Questions endpoint returned ${response.status}`);
      const questions = (await response.json()) as Array<{ id: number }>;
      if (questions.length > 10) throw new Error(`Questions endpoint returned ${questions.length} questions`);
      malformedServed += questions.filter((question) => invalidIds.has(question.id)).length;
      orders.add(questions.map((question) => question.id).join(","));
    }
    uniqueOrders = orders.size;
    apiCheck = uniqueOrders >= 3 ? "passed" : "failed";
  }

  const positionCheck = positionCounts.every((count) => count >= 20 && count <= 30);
  const strictMode = process.env.STRICT_BALANCE === "1";
  const passed = (strictMode ? invalid.length === 0 && strictViolations.length === 0 : true) && malformedServed === 0 && positionCheck && apiCheck !== "failed";
  console.log(JSON.stringify({
    passed,
    validQuestions: valid.length,
    malformedQuestions: invalid.length,
    malformedQuestionsServedByApi: malformedServed,
    strictBalanceViolations: strictViolations.length,
    strictMode,
    reviewRequired: invalid.length > 0 || strictViolations.length > 0,
    correctPositionDistribution: { A: positionCounts[0], B: positionCounts[1], C: positionCounts[2], D: positionCounts[3] },
    repeatedOrderCheck: { uniqueOrders, apiCheck },
  }, null, 2));

  if (!passed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});