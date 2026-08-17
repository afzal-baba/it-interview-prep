/**
 * Admin endpoints — protected by SESSION_SECRET header.
 * POST /admin/rewrite-answers  — rewrites unbalanced wrong answers with AI
 * POST /admin/seed-courses     — syncs all known courses + questions into current DB (idempotent)
 */
import { Router, type IRouter } from "express";
import { db, coursesTable, questionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// ─── Auth helper ─────────────────────────────────────────────────────────────
function authorized(req: Parameters<Parameters<IRouter["post"]>[1]>[0]): boolean {
  const SECRET = process.env.SESSION_SECRET;
  return !!SECRET && req.headers["x-admin-secret"] === SECRET;
}

// ─── All 77 course definitions (source of truth for seeding) ─────────────────
const ALL_COURSES = [
  { name: "Oracle Database",                   slug: "oracle",           category: "Databases",         description: "Master Oracle SQL, PL/SQL, architecture, and performance tuning concepts used in enterprise environments.",                                                                                           icon: "SiDatabricks" },
  { name: "SAP",                               slug: "sap",              category: "Enterprise",        description: "Understand SAP ERP modules, ABAP programming, Basis administration, and SAP S/4HANA architecture.",                                                                                                   icon: "SiSap" },
  { name: "Java",                              slug: "java",             category: "Languages",         description: "Core Java, OOP, concurrency, JVM internals, Spring Framework, and enterprise Java concepts.",                                                                                                          icon: "SiOpenjdk" },
  { name: "Python",                            slug: "python",           category: "Languages",         description: "Python fundamentals, data structures, OOP, async programming, decorators, and popular frameworks.",                                                                                                    icon: "SiPython" },
  { name: "AWS",                               slug: "aws",              category: "Cloud",             description: "Amazon Web Services cloud services, architecture, security, networking, and cloud best practices.",                                                                                                     icon: "SiCloudera" },
  { name: "Linux",                             slug: "linux",            category: "Infrastructure",    description: "Linux command line, shell scripting, system administration, processes, and networking fundamentals.",                                                                                                   icon: "SiLinux" },
  { name: "Docker & Kubernetes",               slug: "docker-k8s",       category: "DevOps",            description: "Master containerisation with Docker and orchestration with Kubernetes — images, pods, deployments, services, and production-grade cluster management.",                                               icon: "SiDocker" },
  { name: "JavaScript",                        slug: "javascript",       category: "Languages",         description: "Deep-dive into JavaScript fundamentals, async patterns, ES6+ features, closures, prototypes, and modern runtime behaviour.",                                                                          icon: "SiJavascript" },
  { name: "Cybersecurity",                     slug: "cybersecurity",    category: "Security",          description: "Understand threat modelling, common attack vectors, encryption, network security, IAM, zero trust security (ZTNA), and industry-standard defensive practices.",                                       icon: "SiHackthebox" },
  { name: "SQL",                               slug: "sql",              category: "Databases",         description: "Master relational databases — queries, joins, aggregation, indexing, transactions, and query optimisation across major RDBMS platforms.",                                                              icon: "SiMysql" },
  { name: "Networking",                        slug: "networking",       category: "Infrastructure",    description: "TCP/IP stack, DNS, HTTP, routing protocols, subnetting, firewalls, load balancers, and cloud networking fundamentals.",                                                                               icon: "SiCisco" },
  { name: "Azure",                             slug: "azure",            category: "Cloud",             description: "Microsoft Azure cloud services — compute, storage, identity, networking, PaaS offerings, and the AZ-900 to AZ-104 certification landscape.",                                                          icon: "SiCloudbees" },
  { name: "Git",                               slug: "git",              category: "DevOps",            description: "Master version control with Git — branching, merging, rebasing, conflict resolution, workflows, and collaborative development best practices.",                                                        icon: "SiGit" },
  { name: "Terraform",                         slug: "terraform",        category: "DevOps",            description: "Infrastructure as Code with Terraform — providers, modules, state management, workspaces, and production-grade IaC patterns on any cloud.",                                                           icon: "SiTerraform" },
  { name: "CI/CD & DevOps",                    slug: "cicd",             category: "DevOps",            description: "Continuous Integration and Delivery pipelines — Jenkins, GitHub Actions, GitLab CI, pipeline design, testing strategies, and deployment automation.",                                                 icon: "SiJenkins" },
  { name: "SRE & Observability",               slug: "sre",              category: "Observability",     description: "Site Reliability Engineering — SLOs, SLAs, error budgets, Prometheus, Grafana, distributed tracing, incident management, and reliability patterns.",                                                  icon: "SiPrometheus" },
  { name: "Ansible",                           slug: "ansible",          category: "DevOps",            description: "Automate configuration management, application deployment, and orchestration with Ansible — playbooks, roles, inventories, and idempotent automation.",                                               icon: "SiAnsible" },
  { name: "GCP",                               slug: "gcp",              category: "Cloud",             description: "Google Cloud Platform services — Compute Engine, GKE, Cloud Storage, BigQuery, Cloud Run, IAM, and the Associate Cloud Engineer certification landscape.",                                             icon: "SiGooglecloud" },
  { name: "TypeScript",                        slug: "typescript",       category: "Languages",         description: "Static typing for JavaScript — type system fundamentals, generics, utility types, declaration files, strict mode, and advanced type patterns.",                                                       icon: "SiTypescript" },
  { name: "Bash & Shell Scripting",            slug: "bash",             category: "Languages",         description: "Linux shell scripting mastery — Bash syntax, file processing, process management, automation patterns, and scripting for DevOps workflows.",                                                          icon: "SiGnubash" },
  { name: "React & Next.js",                   slug: "react",            category: "Frontend",          description: "Master React's component model, hooks, state management, and Next.js full-stack features including SSR, SSG, App Router, and API routes.",                                                            icon: "SiReact" },
  { name: "Node.js",                           slug: "nodejs",           category: "Backend",           description: "Server-side JavaScript with Node.js — the event loop, async patterns, streams, modules, Express, NestJS, and production best practices.",                                                             icon: "SiNodedotjs" },
  { name: "Django & Flask",                    slug: "django",           category: "Backend",           description: "Python web development with Django's batteries-included ORM, admin, and views, plus Flask's lightweight microframework for REST APIs and microservices.",                                              icon: "SiDjango" },
  { name: "Spring Boot",                       slug: "spring-boot",      category: "Backend",           description: "Enterprise Java with Spring Boot — auto-configuration, dependency injection, REST APIs, Spring Data JPA, Spring Security, and microservices patterns.",                                               icon: "SiSpring" },
  { name: "MongoDB & NoSQL",                   slug: "mongodb",          category: "Databases",         description: "Document databases with MongoDB — BSON documents, aggregation pipeline, indexing strategies, replication, sharding, and NoSQL design patterns.",                                                      icon: "SiMongodb" },
  { name: "Redis & Caching",                   slug: "redis",            category: "Databases",         description: "In-memory data structures with Redis — strings, lists, hashes, sets, sorted sets, pub/sub, streams, Lua scripting, clustering, and caching strategies.",                                             icon: "SiRedis" },
  { name: "PostgreSQL",                        slug: "postgresql",       category: "Databases",         description: "Advanced PostgreSQL — ACID transactions, indexing strategies, query planning, window functions, JSONB, partitioning, replication, and performance tuning.",                                           icon: "SiPostgresql" },
  { name: "Machine Learning & AI",             slug: "machine-learning", category: "AI & ML",           description: "Core ML concepts, supervised and unsupervised learning, model evaluation, Python libraries (scikit-learn, TensorFlow, PyTorch), and production ML workflows.",                                        icon: "SiTensorflow" },
  { name: "Apache Kafka",                      slug: "kafka",            category: "Data Engineering",  description: "Distributed event streaming with Apache Kafka — topics, partitions, consumer groups, Kafka Streams, schema registry, exactly-once semantics, and cluster management.",                                icon: "SiApachekafka" },
  { name: "Elasticsearch & ELK Stack",         slug: "elasticsearch",    category: "Observability",     description: "Distributed search and analytics with Elasticsearch, Logstash, and Kibana — inverted indexes, mappings, aggregations, cluster management, and the Elastic Stack.",                                   icon: "SiElasticsearch" },
  { name: "Snowflake & Data Warehousing",      slug: "data-warehouse",   category: "Data Engineering",  description: "Cloud data warehousing concepts — Snowflake architecture, virtual warehouses, data sharing, Time Travel, streams, tasks, and comparisons with BigQuery and Redshift.",                               icon: "SiSnowflake" },
  { name: "VMware & Virtualisation",           slug: "virtualization",   category: "Infrastructure",    description: "Virtualisation fundamentals — hypervisors, VMware vSphere/ESXi, vCenter, vSAN, resource management, high availability, and virtual networking concepts.",                                            icon: "SiVmware" },
  { name: "Selenium & Test Automation",        slug: "testing-qa",       category: "Testing",           description: "Quality assurance and test automation with Selenium WebDriver, Cypress, Playwright, test frameworks, CI integration, and QA best practices.",                                                         icon: "SiSelenium" },
  { name: "GraphQL & API Design",              slug: "graphql",          category: "APIs & Integration", description: "Modern API design with GraphQL — schemas, queries, mutations, subscriptions, resolvers, DataLoader, REST vs. GraphQL trade-offs, and API best practices.",                                          icon: "SiGraphql" },
  { name: "Jira & Agile",                      slug: "jira-agile",       category: "Enterprise",        description: "Agile methodologies, Scrum, Kanban, and Jira project management — sprints, backlog refinement, story points, velocity, and team collaboration practices.",                                            icon: "SiJira" },
  { name: "FastAPI",                           slug: "fastapi",          category: "Backend",           description: "Modern Python APIs with FastAPI — async/await, Pydantic validation, automatic OpenAPI docs, dependency injection, background tasks, and production deployment.",                                      icon: "SiFastapi" },
  { name: "RabbitMQ & Messaging",              slug: "rabbitmq",         category: "Messaging",         description: "Message-oriented middleware with RabbitMQ — AMQP protocol, exchanges, queues, bindings, routing patterns, durability, and comparison with Kafka.",                                                   icon: "SiRabbitmq" },
  { name: "Deep Learning & PyTorch",           slug: "deep-learning",    category: "AI & ML",           description: "Neural networks with PyTorch — tensors, autograd, CNNs, RNNs, transformers, training loops, GPU acceleration, and model deployment.",                                                               icon: "SiPytorch" },
  { name: "HashiCorp Vault",                   slug: "vault",            category: "Security",          description: "Secrets management and data protection with HashiCorp Vault — secret engines, auth methods, policies, dynamic secrets, PKI, and enterprise patterns.",                                                icon: "SiVault" },
  { name: "Vue.js & Angular",                  slug: "vue-angular",      category: "Frontend",          description: "Frontend frameworks — Vue.js Composition API, Vuex/Pinia state management, Vue Router, Angular modules, dependency injection, RxJS, and component architecture.",                                   icon: "SiVuedotjs" },
  { name: "Go (Golang)",                       slug: "golang",           category: "Languages",         description: "Google's compiled, statically typed language — goroutines, channels, interfaces, modules, and building efficient concurrent backend services.",                                                        icon: "SiGo" },
  { name: "C# & .NET",                         slug: "dotnet",           category: "Languages",         description: "Enterprise-grade C# and the .NET ecosystem — OOP, LINQ, async/await, ASP.NET Core, EF Core, and modern .NET performance patterns.",                                                                  icon: "SiCsharp" },
  { name: "PHP & Laravel",                     slug: "php",              category: "Languages",         description: "Server-side web development with PHP — syntax, OOP, Composer, Laravel MVC, Eloquent ORM, Artisan CLI, and REST API best practices.",                                                                  icon: "SiPhp" },
  { name: "Rust",                              slug: "rust",             category: "Languages",         description: "Systems programming with Rust — ownership, borrowing, lifetimes, traits, async/await, WASM targets, and writing safe, high-performance software.",                                                   icon: "SiRust" },
  { name: "NestJS",                            slug: "nestjs",           category: "Backend",           description: "Enterprise Node.js with NestJS — decorators, dependency injection, modules, controllers, services, guards, interceptors, and microservices.",                                                         icon: "SiNestjs" },
  { name: "Ruby on Rails",                     slug: "rails",            category: "Backend",           description: "Full-stack web development with Rails — MVC, Active Record, RESTful routing, migrations, Action Cable, and Rails conventions.",                                                                       icon: "SiRubyonrails" },
  { name: "MySQL",                             slug: "mysql",            category: "Databases",         description: "The world's most popular open-source relational database — schema design, indexing, query optimisation, replication, transactions, and administration.",                                               icon: "SiMysql" },
  { name: "Apache Spark",                      slug: "spark",            category: "Data Engineering",  description: "Distributed data processing at scale — RDDs, DataFrames, Spark SQL, Structured Streaming, MLlib, and Spark on Kubernetes/YARN.",                                                                    icon: "SiApachespark" },
  { name: "Apache Airflow",                    slug: "airflow",          category: "Data Engineering",  description: "Workflow orchestration with Airflow — DAGs, operators, sensors, scheduling, XComs, executors, and production deployment patterns.",                                                                  icon: "SiApacheairflow" },
  { name: "Tableau & Power BI",                slug: "data-viz",         category: "Data Engineering",  description: "Business intelligence and data visualisation — building dashboards, calculated fields, DAX, data modelling, publishing, and performance tuning.",                                                     icon: "SiTableau" },
  { name: "Prometheus & Grafana",              slug: "prometheus-grafana", category: "Observability",   description: "The standard observability stack — metrics collection, PromQL, alerting with Alertmanager, and building Grafana dashboards for production systems.",                                                  icon: "SiPrometheus" },
  { name: "Splunk",                            slug: "splunk",           category: "Observability",     description: "Log management and SIEM with Splunk — SPL queries, data ingestion, indexes, alerts, dashboards, and enterprise security operations.",                                                                icon: "SiSplunk" },
  { name: "PowerShell",                        slug: "powershell",       category: "Infrastructure",    description: "Microsoft's task automation shell — cmdlets, pipelines, scripting, remoting, DSC, and managing Windows and cloud infrastructure.",                                                                   icon: "SiPowershell" },
  { name: "Active Directory & LDAP",           slug: "active-directory", category: "Security",          description: "Enterprise identity with Active Directory — domain structure, group policy, authentication protocols, Azure AD/Entra ID, and LDAP administration.",                                                  icon: "SiMicrosoftazure" },
  { name: "Playwright & Cypress",              slug: "playwright",       category: "Testing",           description: "Modern end-to-end testing — browser automation, selectors, async patterns, network interception, CI integration, and visual testing.",                                                               icon: "SiPlaywright" },
  { name: "LLM & OpenAI APIs",                 slug: "llm-apis",         category: "AI & ML",           description: "Building AI-powered applications — prompting, embeddings, function calling, RAG, agents, fine-tuning, and responsible LLM deployment.",                                                              icon: "SiOpenai" },
  { name: "System Design & Architecture",      slug: "system-design",    category: "Architecture",      description: "Master scalable system design: load balancing, caching, databases, microservices, and distributed systems — essential for senior engineering interviews.",                                            icon: "🏗️" },
  { name: "Generative AI & Prompt Engineering", slug: "generative-ai",  category: "AI & ML",           description: "Build with large language models, design effective prompts, and integrate generative AI into production applications.",                                                                               icon: "🤖" },
  { name: "MLOps & AI Engineering",            slug: "mlops",            category: "AI & ML",           description: "Deploy, monitor, and maintain machine learning models in production — covering ML pipelines, model serving, drift detection, and CI/CD for ML.",                                                     icon: "⚙️" },
  { name: "Microservices Architecture",        slug: "microservices",    category: "Architecture",      description: "Design and build resilient microservices: service discovery, API gateways, circuit breakers, distributed tracing, and inter-service communication patterns.",                                         icon: "🔧" },
  { name: "Kubernetes (Advanced)",             slug: "kubernetes-adv",   category: "DevOps",            description: "Deep-dive into Kubernetes: RBAC, operators, custom controllers, Helm, network policies, stateful workloads, and production cluster management.",                                                     icon: "☸️" },
  { name: "dbt (Data Build Tool)",             slug: "dbt",              category: "Data Engineering",  description: "Transform data in your warehouse with dbt: models, tests, documentation, macros, sources, and best practices for analytics engineering.",                                                            icon: "🔄" },
  { name: "Databricks",                        slug: "databricks",       category: "Data Engineering",  description: "Build data pipelines and ML workflows on Databricks: Delta Lake, Unity Catalog, Spark, MLflow, and lakehouse architecture.",                                                                         icon: "🧱" },
  { name: "LangChain & AI Agents",             slug: "langchain",        category: "AI & ML",           description: "Build LLM-powered applications and autonomous AI agents with LangChain: chains, agents, tools, memory, RAG pipelines, and multi-agent systems.",                                                    icon: "🦜" },
  { name: "Vector Databases",                  slug: "vector-databases", category: "Databases",         description: "Store and query high-dimensional embeddings with vector databases: Pinecone, Weaviate, ChromaDB — powering semantic search and RAG applications.",                                                   icon: "📐" },
  { name: "ArgoCD & GitOps",                   slug: "argocd-gitops",    category: "DevOps",            description: "Implement GitOps workflows with ArgoCD: declarative deployments, sync policies, app-of-apps patterns, rollbacks, and multi-cluster management.",                                                     icon: "🔀" },
  { name: "Apache Flink",                      slug: "flink",            category: "Data Engineering",  description: "Process real-time data streams with Apache Flink: event time processing, windowing, state management, fault tolerance, and streaming SQL.",                                                          icon: "⚡" },
  { name: "Flutter & Dart",                    slug: "flutter",          category: "Mobile",            description: "Build cross-platform mobile apps with Flutter and Dart: widgets, state management, animations, platform channels, and app store deployment.",                                                        icon: "📱" },
  { name: "React Native",                      slug: "react-native",     category: "Mobile",            description: "Develop native mobile apps with React Native: navigation, device APIs, performance optimisation, Expo, and deploying to iOS and Android.",                                                           icon: "📲" },
  { name: "Cloud Security",                    slug: "cloud-security",   category: "Security",          description: "Secure cloud infrastructure on AWS, Azure, and GCP: IAM, encryption, network security, compliance, threat detection, and zero-trust principles.",                                                    icon: "🔒" },
  { name: "Zero Trust Security",               slug: "zero-trust",       category: "Security",          description: "Implement zero-trust architectures: identity-first security, least privilege access, micro-segmentation, continuous verification, and SASE frameworks.",                                              icon: "🛡️" },
  { name: "OpenTelemetry",                     slug: "opentelemetry",    category: "Observability",     description: "Instrument applications with OpenTelemetry: traces, metrics, logs, the OTLP protocol, collectors, and integrating with backends like Jaeger and Prometheus.",                                        icon: "📡" },
  { name: "Scala",                             slug: "scala",            category: "Languages",         description: "Write functional and object-oriented Scala: collections, pattern matching, futures, Akka, and Scala's role in big data with Apache Spark.",                                                           icon: "⚗️" },
  { name: "gRPC & Protocol Buffers",           slug: "grpc",             category: "APIs & Integration", description: "Build high-performance APIs with gRPC and Protocol Buffers: service definitions, streaming, interceptors, error handling, and comparing gRPC with REST.",                                          icon: "🔌" },
  { name: "Svelte",                            slug: "svelte",           category: "Frontend",          description: "Build reactive web interfaces with Svelte and SvelteKit: reactivity, stores, transitions, server-side rendering, and deploying full-stack Svelte apps.",                                             icon: "🔥" },
  { name: ".NET & C#",                         slug: "dotnet-csharp",    category: "Languages",         description: "Master C# and the .NET ecosystem: CLR, async/await, LINQ, generics, ASP.NET Core, Entity Framework, dependency injection, and enterprise patterns used in production .NET applications.",           icon: "💜" },
  { name: "Adobe Experience Manager",          slug: "aem",              category: "CMS & Platforms",   description: "Build and manage enterprise digital experiences with Adobe Experience Manager: content authoring, component development, OSGi, Sling, JCR, workflows, and AEM as a Cloud Service architecture.",    icon: "🎨" },
] as const;

// ─── Question generator (shared with seed scripts) ───────────────────────────
async function generateQuestions(
  courseName: string,
  level: string,
  openaiBase: string,
  openaiKey: string
): Promise<Array<{ text: string; options: string[]; correctOptionIndex: number; explanation: string }>> {
  const levelDesc =
    level === "beginner"
      ? "fundamental concepts, definitions, and basic usage — no deep experience assumed"
      : level === "intermediate"
        ? "practical patterns, common pitfalls, configuration, and real-world usage"
        : "advanced internals, architecture decisions, performance optimisation, and expert-level tradeoffs";

  const resp = await fetch(`${openaiBase}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      max_completion_tokens: 4096,
      messages: [{
        role: "user",
        content: `Generate 10 multiple-choice quiz questions for a technical interview prep platform on: "${courseName}".

Difficulty: ${level} — focus on ${levelDesc}.

CRITICAL requirements:
- Each question has exactly 4 options
- Exactly one is correct
- ALL 4 options must be SIMILAR IN LENGTH and detail (within 20% of each other's character count)
- Wrong options sound plausible and specific, not obviously silly
- Include a 1-2 sentence explanation for why the correct answer is right
- Vary question types: definitions, "what happens when", best practices, comparisons, "which is correct"

Return ONLY a JSON array (no markdown):
[{"text":"...","options":["A","B","C","D"],"correctOptionIndex":0,"explanation":"..."}]`,
      }],
    }),
  });
  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content ?? "[]";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return (JSON.parse(cleaned) as Array<{ text: string; options: string[]; correctOptionIndex: number; explanation: string }>).slice(0, 10);
}

// ─── POST /admin/seed-courses ────────────────────────────────────────────────
// Inserts any courses missing from the DB, then generates questions for
// any course+level that has none. Runs question generation in the background.
router.post("/admin/seed-courses", async (req, res): Promise<void> => {
  if (!authorized(req)) { res.status(401).json({ error: "Unauthorized" }); return; }

  const OPENAI_BASE = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const OPENAI_KEY  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!OPENAI_BASE || !OPENAI_KEY) { res.status(500).json({ error: "OpenAI env vars not set" }); return; }

  const LEVELS = ["beginner", "intermediate", "advanced"] as const;

  // Step 1 — find & insert missing courses
  const courseIds: Array<{ id: number; name: string }> = [];
  const inserted: string[] = [];
  const skipped: string[] = [];

  for (const c of ALL_COURSES) {
    const existing = await db.select({ id: coursesTable.id, name: coursesTable.name })
      .from(coursesTable).where(eq(coursesTable.slug, c.slug)).limit(1);
    if (existing.length > 0) {
      skipped.push(c.name);
      courseIds.push(existing[0]);
    } else {
      const [row] = await db.insert(coursesTable)
        .values({ name: c.name, slug: c.slug, category: c.category, description: c.description, icon: c.icon })
        .returning({ id: coursesTable.id, name: coursesTable.name });
      inserted.push(c.name);
      courseIds.push(row);
    }
  }

  // Step 2 — figure out which course+level combos need questions
  const needsQuestions: Array<{ id: number; name: string; level: string }> = [];
  for (const course of courseIds) {
    for (const level of LEVELS) {
      const has = await db.select({ id: questionsTable.id }).from(questionsTable)
        .where(and(eq(questionsTable.courseId, course.id), eq(questionsTable.level, level))).limit(1);
      if (has.length === 0) needsQuestions.push({ ...course, level });
    }
  }

  res.json({
    message: `Seeding complete. Generating questions for ${needsQuestions.length} course+level combos in background.`,
    coursesInserted: inserted,
    coursesSkipped: skipped.length,
    questionJobsQueued: needsQuestions.length,
  });

  // Background — generate missing questions (5 at a time)
  (async () => {
    let done = 0; let errors = 0;
    const BATCH = 5;
    for (let i = 0; i < needsQuestions.length; i += BATCH) {
      const batch = needsQuestions.slice(i, i + BATCH);
      await Promise.all(batch.map(async (job) => {
        try {
          const qs = await generateQuestions(job.name, job.level, OPENAI_BASE!, OPENAI_KEY!);
          await db.insert(questionsTable).values(qs.map((q) => ({
            courseId: job.id, level: job.level as "beginner" | "intermediate" | "advanced",
            text: q.text, options: q.options,
            correctOptionIndex: q.correctOptionIndex, explanation: q.explanation,
          })));
          done++;
          console.log(`[seed-courses] ✅ ${job.name} [${job.level}] — ${qs.length} questions`);
        } catch (e) {
          errors++;
          console.error(`[seed-courses] ❌ ${job.name} [${job.level}]:`, (e as Error).message);
        }
      }));
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log(`[seed-courses] Done. questions generated: ${done}, errors: ${errors}`);
  })();
});

// ─── POST /admin/rewrite-answers ─────────────────────────────────────────────
function needsRewrite(options: string[], correctIdx: number): boolean {
  const correctLen = options[correctIdx]?.length ?? 0;
  const wrongLens = options.filter((_, i) => i !== correctIdx).map((o) => o.length);
  return correctLen - Math.max(...wrongLens) > 25;
}

router.post("/admin/rewrite-answers", async (req, res): Promise<void> => {
  if (!authorized(req)) { res.status(401).json({ error: "Unauthorized" }); return; }

  const OPENAI_BASE = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const OPENAI_KEY  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!OPENAI_BASE || !OPENAI_KEY) { res.status(500).json({ error: "OpenAI env vars not set" }); return; }

  const allQuestions = await db.select().from(questionsTable);
  const affected = allQuestions.filter((q) => needsRewrite(q.options as string[], q.correctOptionIndex));

  res.json({ message: `Rewriting ${affected.length} of ${allQuestions.length} questions in the background`, affected: affected.length, total: allQuestions.length });

  (async () => {
    const BATCH = 8; let done = 0; let errors = 0;
    for (let i = 0; i < affected.length; i += BATCH) {
      const batch = affected.slice(i, i + BATCH);
      try {
        const payload = batch.map((q) => ({ id: q.id, question: q.text, correct: (q.options as string[])[q.correctOptionIndex], wrong: (q.options as string[]).filter((_, idx) => idx !== q.correctOptionIndex) }));
        const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
          body: JSON.stringify({
            model: "gpt-5.6-luna", max_completion_tokens: 4096,
            messages: [{ role: "user", content: `You are improving a technical quiz. For each question below, the correct answer is significantly longer and more detailed than the wrong answers, making it trivially easy to guess without reading. Rewrite the 3 wrong answers so they:\n- Are similar in length and detail to the correct answer (within ~20% of its character count)\n- Sound plausible and specific — not obviously silly\n- Remain clearly incorrect for someone who knows the topic\n- Preserve the same general format as the correct answer\nReturn ONLY a JSON array (no markdown): [{"id": <number>, "wrong1": "...", "wrong2": "...", "wrong3": "..."}]\n\nQuestions:\n${JSON.stringify(payload, null, 2)}` }],
          }),
        });
        const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        const raw = data.choices?.[0]?.message?.content ?? "[]";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const rewrites: Array<{ id: number; wrong1: string; wrong2: string; wrong3: string }> = JSON.parse(cleaned);
        for (const rewrite of rewrites) {
          const q = batch.find((b) => b.id === rewrite.id);
          if (!q) continue;
          const opts = [...(q.options as string[])];
          const wrongIdxs = [0, 1, 2, 3].filter((i) => i !== q.correctOptionIndex);
          opts[wrongIdxs[0]] = rewrite.wrong1; opts[wrongIdxs[1]] = rewrite.wrong2; opts[wrongIdxs[2]] = rewrite.wrong3;
          await db.update(questionsTable).set({ options: opts }).where(eq(questionsTable.id, q.id));
        }
        done += batch.length;
      } catch (e) { errors += batch.length; console.error(`Admin rewrite batch ${i} failed:`, e); }
      await new Promise((r) => setTimeout(r, 300));
    }
    console.log(`[admin/rewrite-answers] Done: ${done}, Errors: ${errors}`);
  })();
});

export default router;
