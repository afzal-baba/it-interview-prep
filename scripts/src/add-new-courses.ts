/**
 * Adds 19 new courses and generates 10 questions per level (beginner/intermediate/advanced)
 * for each using GPT. Safe to re-run — skips courses/levels already in the DB.
 *
 * Usage: pnpm --filter @workspace/scripts tsx src/add-new-courses.ts
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

const NEW_COURSES = [
  // High Priority
  { name: "System Design & Architecture", slug: "system-design",      category: "Architecture",       description: "Master scalable system design: load balancing, caching, databases, microservices, and distributed systems — essential for senior engineering interviews.", icon: "🏗️" },
  { name: "Generative AI & Prompt Engineering", slug: "generative-ai", category: "AI & ML",           description: "Build with large language models, design effective prompts, and integrate generative AI into production applications.", icon: "🤖" },
  { name: "MLOps & AI Engineering",          slug: "mlops",           category: "AI & ML",            description: "Deploy, monitor, and maintain machine learning models in production — covering ML pipelines, model serving, drift detection, and CI/CD for ML.", icon: "⚙️" },
  { name: "Microservices Architecture",      slug: "microservices",   category: "Architecture",       description: "Design and build resilient microservices: service discovery, API gateways, circuit breakers, distributed tracing, and inter-service communication patterns.", icon: "🔧" },
  { name: "Kubernetes (Advanced)",           slug: "kubernetes-adv",  category: "DevOps",             description: "Deep-dive into Kubernetes: RBAC, operators, custom controllers, Helm, network policies, stateful workloads, and production cluster management.", icon: "☸️" },
  // Growing Fast
  { name: "dbt (Data Build Tool)",           slug: "dbt",             category: "Data Engineering",   description: "Transform data in your warehouse with dbt: models, tests, documentation, macros, sources, and best practices for analytics engineering.", icon: "🔄" },
  { name: "Databricks",                      slug: "databricks",      category: "Data Engineering",   description: "Build data pipelines and ML workflows on Databricks: Delta Lake, Unity Catalog, Spark, MLflow, and lakehouse architecture.", icon: "🧱" },
  { name: "LangChain & AI Agents",           slug: "langchain",       category: "AI & ML",            description: "Build LLM-powered applications and autonomous AI agents with LangChain: chains, agents, tools, memory, RAG pipelines, and multi-agent systems.", icon: "🦜" },
  { name: "Vector Databases",                slug: "vector-databases", category: "Databases",         description: "Store and query high-dimensional embeddings with vector databases: Pinecone, Weaviate, ChromaDB — powering semantic search and RAG applications.", icon: "📐" },
  { name: "ArgoCD & GitOps",                 slug: "argocd-gitops",   category: "DevOps",             description: "Implement GitOps workflows with ArgoCD: declarative deployments, sync policies, app-of-apps patterns, rollbacks, and multi-cluster management.", icon: "🔀" },
  { name: "Apache Flink",                    slug: "flink",           category: "Data Engineering",   description: "Process real-time data streams with Apache Flink: event time processing, windowing, state management, fault tolerance, and streaming SQL.", icon: "⚡" },
  // Mobile
  { name: "Flutter & Dart",                  slug: "flutter",         category: "Mobile",             description: "Build cross-platform mobile apps with Flutter and Dart: widgets, state management, animations, platform channels, and app store deployment.", icon: "📱" },
  { name: "React Native",                    slug: "react-native",    category: "Mobile",             description: "Develop native mobile apps with React Native: navigation, device APIs, performance optimisation, Expo, and deploying to iOS and Android.", icon: "📲" },
  // Security & Infra
  { name: "Cloud Security",                  slug: "cloud-security",  category: "Security",           description: "Secure cloud infrastructure on AWS, Azure, and GCP: IAM, encryption, network security, compliance, threat detection, and zero-trust principles.", icon: "🔒" },
  { name: "Zero Trust Security",             slug: "zero-trust",      category: "Security",           description: "Implement zero-trust architectures: identity-first security, least privilege access, micro-segmentation, continuous verification, and SASE frameworks.", icon: "🛡️" },
  { name: "OpenTelemetry",                   slug: "opentelemetry",   category: "Observability",      description: "Instrument applications with OpenTelemetry: traces, metrics, logs, the OTLP protocol, collectors, and integrating with backends like Jaeger and Prometheus.", icon: "📡" },
  // Additional
  { name: "Scala",                           slug: "scala",           category: "Languages",          description: "Write functional and object-oriented Scala: collections, pattern matching, futures, Akka, and Scala's role in big data with Apache Spark.", icon: "⚗️" },
  { name: "gRPC & Protocol Buffers",         slug: "grpc",            category: "APIs & Integration", description: "Build high-performance APIs with gRPC and Protocol Buffers: service definitions, streaming, interceptors, error handling, and comparing gRPC with REST.", icon: "🔌" },
  { name: "Svelte",                          slug: "svelte",          category: "Frontend",           description: "Build reactive web interfaces with Svelte and SvelteKit: reactivity, stores, transitions, server-side rendering, and deploying full-stack Svelte apps.", icon: "🔥" },
] as const;

interface GeneratedQuestion {
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

async function generateQuestions(courseName: string, level: string): Promise<GeneratedQuestion[]> {
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
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return (JSON.parse(cleaned) as GeneratedQuestion[]).slice(0, 10);
}

async function main() {
  console.log(`\n🚀 Adding ${NEW_COURSES.length} new courses...\n`);

  // Step 1 — Insert courses (skip existing by slug)
  const courseIds: Array<{ id: number; name: string }> = [];
  for (const c of NEW_COURSES) {
    const existing = await db.select().from(coursesTable).where(eq(coursesTable.slug, c.slug)).limit(1);
    if (existing.length > 0) {
      console.log(`  ⏭  Already exists: ${c.name}`);
      courseIds.push({ id: existing[0].id, name: existing[0].name });
    } else {
      const [row] = await db.insert(coursesTable).values({
        name: c.name, slug: c.slug, category: c.category,
        description: c.description, icon: c.icon,
      }).returning({ id: coursesTable.id, name: coursesTable.name });
      console.log(`  ✅ Inserted: ${c.name} (id=${row.id})`);
      courseIds.push(row);
    }
  }

  // Step 2 — Generate questions for each course × level in parallel
  console.log(`\n📝 Generating questions (${courseIds.length} courses × 3 levels)...\n`);
  const limit = pLimit(CONCURRENCY);

  const jobs = courseIds.flatMap((course) =>
    LEVELS.map((level) =>
      limit(async () => {
        // Skip if this course+level already has questions
        const existing = await db
          .select({ id: questionsTable.id })
          .from(questionsTable)
          .where(and(eq(questionsTable.courseId, course.id), eq(questionsTable.level, level)))
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
          console.log(`  ✅ ${course.name} [${level}] — ${questions.length} questions`);
        } catch (err) {
          console.error(`  ❌ ${course.name} [${level}] failed:`, (err as Error).message);
        }
      })
    )
  );

  await Promise.all(jobs);

  // Summary
  const [{ total }] = await db.execute<{ total: string }>({ sql: "SELECT COUNT(*) as total FROM questions", params: [] });
  const [{ courses }] = await db.execute<{ courses: string }>({ sql: "SELECT COUNT(*) as courses FROM courses", params: [] });
  console.log(`\n🎉 Done! Total courses: ${courses}, Total questions: ${total}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
