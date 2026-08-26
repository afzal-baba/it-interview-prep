import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  db,
  coursesTable,
  questionsTable,
} from "@workspace/db";

type Level = "beginner" | "intermediate" | "advanced";

interface ParsedQuestion {
  course: string;
  level: Level;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string | null;
  source: string;
}

interface BankFile {
  questions: ParsedQuestion[];
}

const BANK_PATH = fileURLToPath(
  new URL("../../.agents/outputs/question-bank/question-bank.json", import.meta.url),
);

const courseAliases: Record<string, string> = {
  "aws cloud": "aws",
  aws_cloud: "aws",
  aws: "aws",
  azure: "azure",
  "microsoft azure": "azure",
  gcp: "gcp",
  "google cloud platform": "gcp",
  docker: "docker-k8s",
  "docker kubernetes": "docker-k8s",
  kubernetes: "kubernetes-adv",
  "docker kubernetes security practices": "cloud-security",
  terraform: "terraform",
  "terraform associate professional level": "terraform",
  ansible: "ansible",
  jenkins: "cicd",
  "jenkins ci cd": "cicd",
  linux: "linux",
  networking: "networking",
  "computer networks": "networking",
  "bash shell scripting": "bash",
  "bash and shell scripting": "bash",
  powershell: "powershell",
  "vmware virtualisation": "virtualization",
  "vmware virtualization": "virtualization",
  csharp: "dotnet-csharp",
  "c sharp net": "dotnet-csharp",
  "c net": "dotnet-csharp",
  "c and net": "dotnet-csharp",
  golang: "golang",
  "go golang": "golang",
  java: "java",
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  "python programming": "python",
  "java programming": "java",
  "php laravel": "php",
  "vue angular": "vue-angular",
  "react next js": "react",
  react: "react",
  git: "git",
  "git github": "git",
  rabbitmq: "rabbitmq",
  "rabbitmq messaging": "rabbitmq",
  "elasticsearch logstash kibana elk stack complete assessment": "elasticsearch",
  elk: "elasticsearch",
  "elasticsearch elk stack": "elasticsearch",
  prometheus: "prometheus-grafana",
  "prometheus grafana": "prometheus-grafana",
  sre: "sre",
  "sre observability": "sre",
  splunk: "splunk",
  "splunk enterprise splunk cloud platform v9 1 v9 3 aligned to 2024 2026 syllabus":
    "splunk",
  "active directory ldap": "active-directory",
  "active directory ldap administration and troubleshooting": "active-directory",
  cybersecurity: "cybersecurity",
  vault: "vault",
  "hashicorp vault": "vault",
  "modern end to end testing with playwright cypress 2024 2026": "playwright",
  "playwright cypress": "playwright",
  selenium: "testing-qa",
  "selenium test automation": "testing-qa",
  rust: "rust",
  sql: "sql",
  "sql databases": "sql",
  mongodb: "mongodb",
  "mongodb no sql": "mongodb",
  microservices: "microservices",
  "microservices architecture": "microservices",
  "devops fundamentals": "cicd",
  "ci cd devops": "cicd",
  "jira and agile": "jira-agile",
  "deep learning pytorch": "deep-learning",
  "llm openai apis": "llm-apis",
  "machine learning ai": "machine-learning",
  "graphql api design": "graphql",
  "django flask": "django",
  fastapi: "fastapi",
  nestjs: "nestjs",
  "node js": "nodejs",
  "ruby rails": "rails",
  "spring boot": "spring-boot",
  "apache airflow": "airflow",
  "apache kafka": "kafka",
  "apache spark": "spark",
  "snowflake data warehousing": "data-warehouse",
  "tableau power bi": "data-viz",
  mysql: "mysql",
  "oracle database": "oracle",
  postgresql: "postgresql",
  "redis caching": "redis",
  sap: "sap",
  "vue js angular": "vue-angular",
  "typescript modern typed javascript development": "typescript",
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuestion(value: string): string {
  return normalize(value).replace(/\b(q|question)\s*\d+\b/g, "");
}

function courseSlugFor(sourceName: string): string | null {
  let normalized = normalize(sourceName)
    .replace(/\bpractice exam\b/g, "")
    .replace(/\bcomprehensive (assessment|examination|exam)\b/g, "")
    .replace(/\bcomplete (assessment|exam)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const direct = courseAliases[normalized];
  if (direct) return direct;

  if (normalized.includes("aws")) return "aws";
  if (normalized.includes("azure")) return "azure";
  if (normalized.includes("google cloud") || normalized === "gcp") return "gcp";
  if (normalized.includes("kubernetes")) return "kubernetes-adv";
  if (normalized.includes("docker")) return "docker-k8s";
  if (normalized.includes("terraform")) return "terraform";
  if (normalized.includes("ansible")) return "ansible";
  if (normalized.includes("jenkins") || normalized.includes("devops")) return "cicd";
  if (normalized.includes("linux")) return "linux";
  if (normalized.includes("network")) return "networking";
  if (normalized.includes("powershell")) return "powershell";
  if (normalized.includes("vmware")) return "virtualization";
  if (normalized.includes("csharp") || normalized.includes("c sharp")) {
    return "dotnet-csharp";
  }
  if (normalized.includes("golang")) return "golang";
  if (normalized === "java") return "java";
  if (normalized === "javascript") return "javascript";
  if (normalized.includes("typescript")) return "typescript";
  if (normalized === "python") return "python";
  if (normalized.includes("php")) return "php";
  if (normalized.includes("vue") || normalized.includes("angular")) return "vue-angular";
  if (normalized.includes("react")) return "react";
  if (normalized.includes("git")) return "git";
  if (normalized.includes("rabbitmq")) return "rabbitmq";
  if (normalized.includes("elasticsearch") || normalized === "elk") return "elasticsearch";
  if (normalized.includes("prometheus") || normalized.includes("grafana")) {
    return "prometheus-grafana";
  }
  if (normalized.includes("sre") || normalized.includes("observability")) return "sre";
  if (normalized.includes("splunk")) return "splunk";
  if (normalized.includes("active directory")) return "active-directory";
  if (normalized.includes("cybersecurity")) return "cybersecurity";
  if (normalized.includes("vault")) return "vault";
  if (normalized.includes("playwright")) return "playwright";
  if (normalized.includes("selenium")) return "testing-qa";
  if (normalized === "rust" || normalized.includes("rust programming")) return "rust";
  if (normalized === "sql" || normalized.includes("sql database")) return "sql";
  if (normalized.includes("mongodb")) return "mongodb";
  if (normalized.includes("microservices")) return "microservices";
  if (normalized.includes("deep learning")) return "deep-learning";
  if (normalized.includes("llm") || normalized.includes("openai")) return "llm-apis";
  if (normalized.includes("machine learning")) return "machine-learning";
  if (normalized.includes("graphql")) return "graphql";
  if (normalized.includes("django")) return "django";
  if (normalized.includes("fastapi")) return "fastapi";
  if (normalized.includes("nestjs")) return "nestjs";
  if (normalized.includes("node js")) return "nodejs";
  if (normalized.includes("ruby")) return "rails";
  if (normalized.includes("spring boot")) return "spring-boot";
  if (normalized.includes("airflow")) return "airflow";
  if (normalized.includes("kafka")) return "kafka";
  if (normalized.includes("spark")) return "spark";
  if (normalized.includes("snowflake") || normalized.includes("data warehousing")) {
    return "data-warehouse";
  }
  if (normalized.includes("tableau") || normalized.includes("power bi")) return "data-viz";
  if (normalized === "mysql") return "mysql";
  if (normalized.includes("oracle")) return "oracle";
  if (normalized.includes("postgresql")) return "postgresql";
  if (normalized.includes("redis")) return "redis";
  if (normalized === "sap") return "sap";
  return null;
}

function questionKey(
  courseId: number,
  question: Pick<ParsedQuestion, "level" | "text" | "options">,
): string {
  return [
    courseId,
    question.level,
    normalizeQuestion(question.text),
    ...question.options.map(normalizeQuestion),
  ].join("|");
}

async function main() {
  const bank = JSON.parse(
    await readFile(BANK_PATH, "utf8"),
  ) as BankFile;
  const courses = await db.select().from(coursesTable);
  const bySlug = new Map(courses.map((course) => [course.slug, course]));

  const existing = await db.select().from(questionsTable);
  const known = new Set(
    existing.map((question) => questionKey(question.courseId, question)),
  );
  const insertedKeys = new Set<string>();
  const rowsByCourse = new Map<number, typeof questionsTable.$inferInsert[]>();
  const unmatched = new Map<string, number>();
  let invalid = 0;
  let duplicate = 0;

  for (const question of bank.questions) {
    const slug = courseSlugFor(question.course);
    const course = slug ? bySlug.get(slug) : undefined;
    if (!course) {
      unmatched.set(question.course, (unmatched.get(question.course) ?? 0) + 1);
      continue;
    }
    if (
      !question.text.trim() ||
      question.options.length !== 4 ||
      question.options.some((option) => !option.trim()) ||
      question.correctOptionIndex < 0 ||
      question.correctOptionIndex > 3
    ) {
      invalid++;
      continue;
    }

    const key = questionKey(course.id, question);
    if (known.has(key) || insertedKeys.has(key)) {
      duplicate++;
      continue;
    }
    insertedKeys.add(key);
    const row = {
      courseId: course.id,
      level: question.level,
      text: question.text.trim(),
      options: question.options.map((option) => option.trim()),
      correctOptionIndex: question.correctOptionIndex,
      explanation: question.explanation?.trim() || null,
    } satisfies typeof questionsTable.$inferInsert;
    const rows = rowsByCourse.get(course.id) ?? [];
    rows.push(row);
    rowsByCourse.set(course.id, rows);
  }

  let inserted = 0;
  if (process.argv.includes("--dry-run")) {
    inserted = insertedKeys.size;
  } else {
    await db.transaction(async (tx) => {
      for (const rows of rowsByCourse.values()) {
        for (let index = 0; index < rows.length; index += 100) {
          const batch = rows.slice(index, index + 100);
          await tx.insert(questionsTable).values(batch);
          inserted += batch.length;
        }
      }
    });
  }

  console.log(JSON.stringify({
    parsed: bank.questions.length,
    inserted,
    duplicate,
    invalid,
    unmatched: Object.fromEntries(unmatched),
    matchedCourseCount: rowsByCourse.size,
    insertedByCourse: Object.fromEntries(
      [...rowsByCourse.entries()].map(([courseId, rows]) => [courseId, rows.length]),
    ),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { pool } = await import("@workspace/db");
    await pool.end();
  });