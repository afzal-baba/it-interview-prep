import { useState, lazy, Suspense, useEffect } from "react";
import { useLocation } from "wouter";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChallengeTask {
  type: "sql" | "python" | "javascript" | "architecture";
  prompt: string;
}
export interface ChallengeTab {
  name: string;
  technologies?: string[];
  tasks: ChallengeTask[];
}
export interface Challenge {
  title: string;
  description?: string;
  tasks?: ChallengeTask[];
  tabs?: ChallengeTab[];
  instructions?: string;
}
interface TechChallenge {
  title: string;
  description: string;
  tasks: ChallengeTask[];
  points: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
}

// ── Accent colours (mirrored from home.tsx) ───────────────────────────────────

const SLUG_ACCENT: Record<string, string> = {
  oracle: "#f0748a", sap: "#8f7bf0", java: "#f0b84f", python: "#5be3d8",
  aws: "#f0a35c", linux: "#6fd3f0", "docker-k8s": "#5be3d8", javascript: "#f0b84f",
  cybersecurity: "#f0748a", sql: "#8f7bf0", networking: "#6fd3f0", azure: "#6fd3f0",
  git: "#f0a35c", terraform: "#8f7bf0", cicd: "#f0a35c", sre: "#5be3d8",
  ansible: "#f0748a", gcp: "#f0b84f", typescript: "#5be3d8", bash: "#f0b84f",
  react: "#5be3d8", nodejs: "#6fd3f0", django: "#5be3d8", "spring-boot": "#f0b84f",
  mongodb: "#6fd3f0", redis: "#f0748a", postgresql: "#6fd3f0",
  "machine-learning": "#f0b84f", kafka: "#f0748a", elasticsearch: "#f0a35c",
  "data-warehouse": "#5be3d8", virtualization: "#6fd3f0", "testing-qa": "#8f7bf0",
  graphql: "#f0748a", "jira-agile": "#f0a35c", fastapi: "#5be3d8",
  rabbitmq: "#f0748a", "deep-learning": "#8f7bf0", vault: "#f0b84f", "vue-angular": "#6fd3f0",
};

// ── Technology challenges (40 courses) ────────────────────────────────────────

const TECH_CHALLENGES: Record<string, TechChallenge> = {
  python: {
    title: "Python Challenge", category: "Programming", points: 30, difficulty: "intermediate",
    description: "Solve real-world problems using Python — the language behind Django, FastAPI, ML, and more.",
    tasks: [
      { type: "python", prompt: "Write a Python function `find_duplicates(lst)` that returns all duplicate elements in a list in sorted order. Handle empty lists and single-element lists. Aim for O(n) time using a dict or Counter." },
      { type: "python", prompt: "Implement a decorator `@retry(times=3, delay=1)` that retries any function on exception, waiting `delay` seconds between attempts, and re-raises the last exception if all attempts fail." },
    ],
  },
  javascript: {
    title: "JavaScript Challenge", category: "Programming", points: 30, difficulty: "intermediate",
    description: "Demonstrate core JavaScript knowledge — closures, async, and the event loop.",
    tasks: [
      { type: "javascript", prompt: "Write a `debounce(fn, ms)` function that delays calling `fn` until `ms` milliseconds after the last invocation. Show a usage example with a search input." },
      { type: "javascript", prompt: "Implement `Promise.allSettled` from scratch without using the native version. It should return an array of `{status: 'fulfilled'|'rejected', value/reason}` objects." },
    ],
  },
  typescript: {
    title: "TypeScript Challenge", category: "Programming", points: 35, difficulty: "intermediate",
    description: "Use TypeScript's type system to write safe, expressive code.",
    tasks: [
      { type: "javascript", prompt: "Write a generic TypeScript function `groupBy<T>(arr: T[], key: keyof T): Record<string, T[]>` that groups an array of objects by a given key. Include the full type signature and a usage example." },
      { type: "javascript", prompt: "Create a TypeScript utility type `DeepReadonly<T>` that makes all nested properties of an object read-only recursively. Show how it differs from the built-in `Readonly<T>`." },
    ],
  },
  java: {
    title: "Java Challenge", category: "Programming", points: 35, difficulty: "intermediate",
    description: "Solve OOP and algorithmic problems in Java, the backbone of Spring Boot and enterprise systems.",
    tasks: [
      { type: "architecture", prompt: "Explain the difference between an interface and an abstract class in Java. Give a concrete example (not just Animal/Dog) where you'd choose each. Mention `default` methods introduced in Java 8." },
      { type: "javascript", prompt: "Write a Java method that takes a List<Integer> and returns a Map<Boolean, List<Integer>> partitioned into even and odd numbers, using Java Streams and Collectors.partitioningBy." },
    ],
  },
  sql: {
    title: "SQL Challenge", category: "Databases", points: 25, difficulty: "intermediate",
    description: "Write efficient SQL queries for real reporting and analytics scenarios.",
    tasks: [
      { type: "sql", prompt: "You have tables: `orders(id, customer_id, amount, created_at)` and `customers(id, name, country)`. Write a query to find the top 3 customers by total order amount in the last 90 days, including their country." },
      { type: "sql", prompt: "Write a query using window functions to find, for each month in 2024, the running total of revenue AND the month-over-month percentage change in revenue. Use the `orders` table from above." },
    ],
  },
  postgresql: {
    title: "PostgreSQL Challenge", category: "Databases", points: 35, difficulty: "advanced",
    description: "Dive into PostgreSQL-specific features: CTEs, JSON, indexing, and performance.",
    tasks: [
      { type: "sql", prompt: "Write a PostgreSQL query using a recursive CTE to traverse a self-referencing `employees(id, name, manager_id)` table and return the full org chart with depth level for each employee." },
      { type: "architecture", prompt: "A query `SELECT * FROM orders WHERE status = 'pending' AND created_at > NOW() - INTERVAL '7 days'` is slow on a table with 50M rows. Walk through your indexing strategy, explaining partial indexes, composite indexes, and how you'd use EXPLAIN ANALYZE to verify improvement." },
    ],
  },
  mongodb: {
    title: "MongoDB Challenge", category: "Databases", points: 30, difficulty: "intermediate",
    description: "Query and design schemas for MongoDB, the leading document NoSQL database.",
    tasks: [
      { type: "architecture", prompt: "You're building a blog platform. Design a MongoDB schema for posts with nested comments (max 2 levels deep). Show the document structure and explain your choice between embedding comments vs. referencing a separate collection, considering query patterns." },
      { type: "architecture", prompt: "Write a MongoDB aggregation pipeline that, given a `sales` collection with `{product, quantity, price, date}` documents, calculates monthly revenue per product for Q1 2024, sorted by revenue descending." },
    ],
  },
  redis: {
    title: "Redis Challenge", category: "Databases", points: 30, difficulty: "intermediate",
    description: "Implement caching, sessions, and rate limiting with Redis.",
    tasks: [
      { type: "architecture", prompt: "Design a Redis-based rate limiter that allows 100 requests per user per minute using the sliding window algorithm. Describe the key structure, commands used (ZADD, ZREMRANGEBYSCORE, ZCARD), and TTL strategy." },
      { type: "architecture", prompt: "Explain the difference between Redis cache-aside, write-through, and write-behind strategies. For a high-read e-commerce product catalogue, which strategy would you use and why? What cache invalidation problems might arise?" },
    ],
  },
  aws: {
    title: "AWS Challenge", category: "Cloud", points: 40, difficulty: "advanced",
    description: "Design scalable, cost-effective solutions using AWS services like EC2, S3, Lambda, and RDS.",
    tasks: [
      { type: "architecture", prompt: "Design the AWS architecture for a multi-tenant SaaS application that serves 100k users. Include: compute (EC2/ECS/Lambda), database (RDS Multi-AZ + ElastiCache), storage (S3), networking (VPC, ALB, Route 53, CloudFront), and security (IAM, Security Groups, WAF). Draw and label the architecture." },
      { type: "architecture", prompt: "You receive a PagerDuty alert: your RDS instance CPU is at 95% and read latency has jumped to 2s. Walk through your incident response — from diagnosing with CloudWatch, to adding a read replica, to long-term query optimisation." },
    ],
  },
  azure: {
    title: "Azure Challenge", category: "Cloud", points: 40, difficulty: "advanced",
    description: "Build cloud solutions using Microsoft Azure services.",
    tasks: [
      { type: "architecture", prompt: "A company wants to migrate a monolithic .NET application to Azure. Design an architecture using Azure App Service (or AKS), Azure SQL Database, Azure Blob Storage, and Azure Active Directory for auth. Explain each service choice." },
      { type: "architecture", prompt: "Explain the difference between Azure Functions (serverless), Azure App Service, and Azure Container Apps. For each, name two ideal use cases and one situation where you would avoid it." },
    ],
  },
  gcp: {
    title: "GCP Challenge", category: "Cloud", points: 40, difficulty: "advanced",
    description: "Leverage Google Cloud Platform services for compute, data, and AI workloads.",
    tasks: [
      { type: "architecture", prompt: "Design a real-time data pipeline on GCP: events arrive via Pub/Sub, are processed by Dataflow (Apache Beam), stored in BigQuery, and visualised in Looker Studio. Draw the architecture and explain the role of each service." },
      { type: "architecture", prompt: "Compare GCP's Compute Engine, Google Kubernetes Engine (GKE), and Cloud Run. For a containerised microservices app with unpredictable traffic, which would you choose and why? How does GKE Autopilot differ from Standard?" },
    ],
  },
  "docker-k8s": {
    title: "Docker & Kubernetes Challenge", category: "DevOps", points: 40, difficulty: "advanced",
    description: "Containerise applications with Docker and orchestrate them with Kubernetes.",
    tasks: [
      { type: "architecture", prompt: "Write a multi-stage Dockerfile for a Node.js API that: (1) uses a builder stage to compile TypeScript, (2) uses a minimal `node:alpine` final image, (3) runs as a non-root user, (4) exposes port 3000 via ENV. Explain each RUN layer's purpose." },
      { type: "architecture", prompt: "Your Kubernetes pod keeps crashing with `OOMKilled`. Walk through your debugging steps: what kubectl commands do you run, what resource limits/requests do you set, how do you use Vertical Pod Autoscaler or HPA to prevent recurrence?" },
    ],
  },
  terraform: {
    title: "Terraform Challenge", category: "IaC", points: 35, difficulty: "advanced",
    description: "Provision and manage cloud infrastructure as code with Terraform.",
    tasks: [
      { type: "architecture", prompt: "Write Terraform HCL to provision an AWS VPC with two public and two private subnets across two AZs, an Internet Gateway for public subnets, and a NAT Gateway for private subnets. Use variables for CIDR blocks and region." },
      { type: "architecture", prompt: "Explain Terraform state: what it is, why it's dangerous to share a local state file in a team, and how you'd set up remote state in S3 with DynamoDB locking. What happens if two engineers run `terraform apply` simultaneously?" },
    ],
  },
  ansible: {
    title: "Ansible Challenge", category: "IaC", points: 30, difficulty: "intermediate",
    description: "Automate server configuration and deployments with Ansible playbooks.",
    tasks: [
      { type: "architecture", prompt: "Write an Ansible playbook that: (1) installs nginx on all `webservers` hosts, (2) copies a templated `nginx.conf` with a configurable `server_name` variable, (3) ensures nginx is started and enabled, (4) notifies a handler to reload nginx on config change." },
      { type: "architecture", prompt: "Explain the difference between Ansible roles and playbooks. How would you structure a role for deploying a Python application? List the standard role directory structure and the purpose of `defaults/`, `vars/`, `tasks/`, and `handlers/`." },
    ],
  },
  linux: {
    title: "Linux & Sysadmin Challenge", category: "Systems", points: 25, difficulty: "intermediate",
    description: "Demonstrate Linux command-line proficiency for real sysadmin scenarios.",
    tasks: [
      { type: "architecture", prompt: "A production web server is responding slowly. Write the sequence of Linux commands you'd run to diagnose: CPU usage (top/htop), memory pressure (free, vmstat), disk I/O (iostat, df), and network connections (netstat/ss). For each command, explain what output would indicate a problem." },
      { type: "bash", prompt: "Write a Bash script that: (1) finds all `.log` files in `/var/log` older than 7 days, (2) compresses them with gzip, (3) moves them to `/var/log/archive/`, (4) logs each action with a timestamp to `/var/log/archive/cleanup.log`." } as { type: "architecture"; prompt: string },
    ],
  },
  bash: {
    title: "Bash & Shell Scripting Challenge", category: "Systems", points: 25, difficulty: "intermediate",
    description: "Write production-quality shell scripts for automation and system tasks.",
    tasks: [
      { type: "architecture", prompt: "Write a Bash script that accepts a directory path as an argument, recursively finds all `.csv` files, counts the number of lines in each (excluding the header), and prints a summary table: `filename | rows`. Handle the case where the directory doesn't exist." },
      { type: "architecture", prompt: "Explain the difference between `$()` and backticks, `&&` vs `;` vs `||` for command chaining, and `>` vs `>>` vs `2>&1` for redirection. Give a one-line example of each." },
    ],
  },
  git: {
    title: "Git Challenge", category: "Version Control", points: 20, difficulty: "beginner",
    description: "Demonstrate Git proficiency — branching, merging, rebasing, and conflict resolution.",
    tasks: [
      { type: "architecture", prompt: "Explain Git Flow vs GitHub Flow vs Trunk-Based Development. For a team of 8 developers shipping multiple times a day to production, which would you recommend and why? What branch protection rules would you add?" },
      { type: "architecture", prompt: "A developer accidentally committed secrets to `main` and pushed. Walk through the steps to: (1) remove the secret from git history using `git filter-branch` or BFG Repo Cleaner, (2) force-push, (3) rotate the credentials, (4) prevent it happening again." },
    ],
  },
  cicd: {
    title: "CI/CD & DevOps Challenge", category: "DevOps", points: 35, difficulty: "intermediate",
    description: "Design and implement CI/CD pipelines using Jenkins, GitHub Actions, or GitLab CI.",
    tasks: [
      { type: "architecture", prompt: "Design a GitHub Actions CI/CD pipeline for a Node.js API that: (1) runs tests on every PR, (2) builds and pushes a Docker image to ECR on merge to main, (3) deploys to staging automatically, (4) requires manual approval before production. Write the key YAML structure." },
      { type: "architecture", prompt: "Explain the difference between blue/green deployment, canary deployment, and rolling deployment. For a zero-downtime requirement with a stateful database schema migration, which strategy works best and what extra steps do you take?" },
    ],
  },
  sre: {
    title: "SRE & Observability Challenge", category: "Operations", points: 40, difficulty: "advanced",
    description: "Apply SRE principles: SLOs, error budgets, alerting, and observability with Prometheus & Grafana.",
    tasks: [
      { type: "architecture", prompt: "Define SLI, SLO, and SLA with a concrete example for an e-commerce checkout API. If the SLO is 99.9% availability over 30 days and the error budget is 43 minutes — write the PromQL query to track remaining error budget and describe the Grafana dashboard you'd build." },
      { type: "architecture", prompt: "Your Prometheus alert fires: `APIErrorRateHigh` — 5xx errors > 1% for 5 minutes. Walk through your full incident response: initial triage (which logs/metrics/traces you check), how you communicate status, mitigation steps, and post-mortem structure." },
    ],
  },
  networking: {
    title: "Networking Challenge", category: "Infrastructure", points: 30, difficulty: "intermediate",
    description: "Demonstrate networking fundamentals: TCP/IP, DNS, load balancing, and VPNs.",
    tasks: [
      { type: "architecture", prompt: "Trace the complete journey of a browser request to `https://api.example.com/v1/products` — from DNS resolution (including recursive vs authoritative servers), TCP handshake, TLS negotiation, HTTP/2 multiplexing, through to the server response. At each step name the protocol and port." },
      { type: "architecture", prompt: "Explain the difference between L4 and L7 load balancing. Why would you choose an Application Load Balancer (ALB) over a Network Load Balancer (NLB) on AWS? What are sticky sessions and when are they problematic?" },
    ],
  },
  cybersecurity: {
    title: "Cybersecurity Challenge", category: "Security", points: 40, difficulty: "advanced",
    description: "Apply security concepts: OWASP Top 10, encryption, IAM, and incident response.",
    tasks: [
      { type: "architecture", prompt: "Explain SQL injection with a real code example, then show the secure version using parameterised queries. Also describe XSS (stored vs reflected) and how Content Security Policy (CSP) headers mitigate it. What OWASP Top 10 category covers each?" },
      { type: "architecture", prompt: "Design a secrets management strategy for a microservices application on Kubernetes using HashiCorp Vault. Describe: how services authenticate to Vault (Kubernetes auth method), how secrets are injected (Agent Sidecar vs Vault Secrets Operator), and how you handle secret rotation." },
    ],
  },
  react: {
    title: "React Challenge", category: "Frontend", points: 30, difficulty: "intermediate",
    description: "Build and reason about React components, hooks, state, and performance.",
    tasks: [
      { type: "javascript", prompt: "Write a custom React hook `useDebounce<T>(value: T, delay: number): T` that delays updating the returned value until `delay` ms after the last change. Then write a `SearchInput` component that uses it to avoid firing an API call on every keystroke." },
      { type: "architecture", prompt: "A React component is re-rendering too frequently and causing a performance issue. Walk through your debugging approach: which React DevTools profiler views you'd use, how you'd apply `useMemo`, `useCallback`, and `React.memo`, and when each is actually needed vs overkill." },
    ],
  },
  nodejs: {
    title: "Node.js Challenge", category: "Backend", points: 30, difficulty: "intermediate",
    description: "Build robust APIs and understand Node.js internals: the event loop, streams, and clustering.",
    tasks: [
      { type: "javascript", prompt: "Write an Express.js middleware function that rate-limits requests to 60/minute per IP using an in-memory Map. The middleware should return a 429 status with a `Retry-After` header when the limit is exceeded. Clean up old entries every minute." },
      { type: "architecture", prompt: "Explain the Node.js event loop: what happens in the call stack, the libuv thread pool, and the microtask queue (Promise callbacks). Why does a `while(true)` block the entire server? How would you handle a CPU-intensive task without blocking?" },
    ],
  },
  django: {
    title: "Django & Flask Challenge", category: "Backend", points: 30, difficulty: "intermediate",
    description: "Build web applications and REST APIs with Django and Flask.",
    tasks: [
      { type: "python", prompt: "Write a Django REST Framework view (APIView or ViewSet) for a `POST /api/orders/` endpoint that: (1) validates the request body with a serializer, (2) checks the user is authenticated, (3) creates an Order object, (4) sends a confirmation email asynchronously via Celery, and (5) returns the created order as JSON." },
      { type: "architecture", prompt: "Explain Django's ORM N+1 query problem with a concrete example using `Author` and `Book` models. Show the bad code, the fix using `select_related` or `prefetch_related`, and how you'd detect it in production using Django Debug Toolbar or logging." },
    ],
  },
  "spring-boot": {
    title: "Spring Boot Challenge", category: "Backend", points: 35, difficulty: "intermediate",
    description: "Build Java microservices with Spring Boot, Spring Data, and Spring Security.",
    tasks: [
      { type: "architecture", prompt: "Design a Spring Boot REST API for a simple e-commerce service. Show the key annotations you'd use: `@RestController`, `@Service`, `@Repository`, `@Entity`, `@Transactional`. Explain the layered architecture (Controller → Service → Repository) and why each layer exists." },
      { type: "architecture", prompt: "Explain Spring Boot's auto-configuration mechanism: how does `@SpringBootApplication` trigger it, what is a `@ConditionalOnClass`, and how would you write a custom auto-configuration for a shared library? Why is this better than manual bean registration?" },
    ],
  },
  "machine-learning": {
    title: "Machine Learning Challenge", category: "AI/ML", points: 40, difficulty: "advanced",
    description: "Apply ML concepts using Python, scikit-learn, and real-world model evaluation.",
    tasks: [
      { type: "python", prompt: "Write Python code (using scikit-learn) to: (1) load the Iris dataset, (2) split into 80/20 train/test with a fixed random seed, (3) train a Random Forest classifier, (4) print a classification report with precision, recall, F1-score per class, and (5) plot the feature importances." },
      { type: "architecture", prompt: "You trained a model with 98% training accuracy but only 72% test accuracy. Diagnose the problem, explain overfitting vs underfitting, and describe 4 techniques to fix it (e.g. regularisation, dropout, cross-validation, more data). When would you add more features vs more data?" },
    ],
  },
  "deep-learning": {
    title: "Deep Learning & PyTorch Challenge", category: "AI/ML", points: 45, difficulty: "advanced",
    description: "Build and train neural networks using PyTorch, from CNNs to Transformers.",
    tasks: [
      { type: "python", prompt: "Write a PyTorch class `SimpleCNN` that inherits `nn.Module` with: (1) two Conv2d layers with ReLU and MaxPool2d, (2) two fully connected layers, (3) a `forward()` method. The model should classify 32×32 RGB images into 10 classes." },
      { type: "architecture", prompt: "Explain the Transformer self-attention mechanism: what are Query, Key, and Value matrices, how is the attention score computed (scaled dot-product), and why is multi-head attention better than single-head? How does positional encoding solve the order-blindness of attention?" },
    ],
  },
  kafka: {
    title: "Apache Kafka Challenge", category: "Messaging", points: 35, difficulty: "advanced",
    description: "Design event-driven systems using Apache Kafka for stream processing.",
    tasks: [
      { type: "architecture", prompt: "Design a Kafka-based architecture for a real-time order processing system: producers (checkout service), topics with partition strategy, consumer groups (inventory, notifications, analytics services). Explain how you'd guarantee exactly-once delivery and handle consumer lag." },
      { type: "architecture", prompt: "Explain the difference between Kafka topics, partitions, consumer groups, and offsets. If a consumer crashes mid-processing, what happens to unprocessed messages? How do `auto.commit` and manual `commitSync/commitAsync` differ in terms of at-least-once vs exactly-once semantics?" },
    ],
  },
  elasticsearch: {
    title: "Elasticsearch & ELK Stack Challenge", category: "Search", points: 35, difficulty: "advanced",
    description: "Query and design indices in Elasticsearch; build observability with the ELK Stack.",
    tasks: [
      { type: "architecture", prompt: "Write an Elasticsearch query (JSON DSL) to search a `products` index for items where: (1) the name matches 'wireless headphones' (full-text), (2) price is between $50 and $200, (3) category is exactly 'electronics', (4) results are sorted by rating descending. Explain `must`, `filter`, and `should` clauses." },
      { type: "architecture", prompt: "Your Elasticsearch cluster has 3 nodes and an index with 5 primary shards and 1 replica. Explain: how documents are routed to shards, what happens when a node goes down, the difference between yellow/green/red cluster health, and how you'd reindex to change the shard count." },
    ],
  },
  "data-warehouse": {
    title: "Snowflake & Data Warehousing Challenge", category: "Data", points: 35, difficulty: "advanced",
    description: "Design dimensional models and write analytical SQL for data warehouses like Snowflake and BigQuery.",
    tasks: [
      { type: "sql", prompt: "Design a star schema for an e-commerce data warehouse: define the `fact_orders` table and at least 3 dimension tables (`dim_customer`, `dim_product`, `dim_date`). Then write a Snowflake SQL query using the schema to find monthly revenue by product category for 2024, with a ROLLUP for subtotals." },
      { type: "architecture", prompt: "Explain the difference between a Star Schema and a Snowflake Schema. When would you denormalise (star) vs normalise (snowflake)? Describe what dbt does in a modern ELT pipeline and how it differs from traditional ETL tools like Talend or Informatica." },
    ],
  },
  graphql: {
    title: "GraphQL & API Design Challenge", category: "APIs", points: 30, difficulty: "intermediate",
    description: "Design GraphQL schemas and compare REST vs GraphQL architectural trade-offs.",
    tasks: [
      { type: "architecture", prompt: "Write a GraphQL schema for a blog platform with: `User`, `Post`, and `Comment` types. Include queries (`getPost`, `listPosts`), mutations (`createPost`, `addComment`), and a subscription (`onNewComment`). Add appropriate arguments and return types." },
      { type: "architecture", prompt: "Explain the N+1 problem in GraphQL with an example (e.g. fetching authors for a list of posts). How does DataLoader solve it using batching and caching? Compare REST pagination (cursor/offset) with GraphQL Connections spec (edges, node, pageInfo)." },
    ],
  },
  fastapi: {
    title: "FastAPI Challenge", category: "Backend", points: 30, difficulty: "intermediate",
    description: "Build high-performance Python APIs with FastAPI, Pydantic, and async/await.",
    tasks: [
      { type: "python", prompt: "Write a FastAPI endpoint `POST /users/` that: (1) accepts a Pydantic model `UserCreate(name, email, password)`, (2) validates that email is unique using an async DB check, (3) hashes the password with bcrypt, (4) saves to the database, (5) returns a `UserResponse` model that omits the password. Use dependency injection for the DB session." },
      { type: "architecture", prompt: "Explain how FastAPI uses Pydantic for request validation and response serialisation. What is the difference between `response_model` and the actual return type? How does FastAPI handle async database queries with SQLAlchemy async — why is `async with AsyncSession()` important?" },
    ],
  },
  rabbitmq: {
    title: "RabbitMQ & Messaging Challenge", category: "Messaging", points: 30, difficulty: "intermediate",
    description: "Design message-based systems with RabbitMQ, exchanges, queues, and routing.",
    tasks: [
      { type: "architecture", prompt: "Design a RabbitMQ topology for an order processing system: explain which exchange type you'd use (direct, topic, fanout, or headers), how you'd route `order.created`, `order.shipped`, `order.cancelled` messages to the right consumer queues, and how dead-letter queues handle failed messages." },
      { type: "architecture", prompt: "Compare RabbitMQ and Apache Kafka for a use case where you need to process payment events. Consider: message durability, consumer groups, replay/rewind capability, throughput, and ordering guarantees. Which would you choose and why?" },
    ],
  },
  vault: {
    title: "HashiCorp Vault Challenge", category: "Security", points: 35, difficulty: "advanced",
    description: "Manage secrets, encryption, and PKI with HashiCorp Vault.",
    tasks: [
      { type: "architecture", prompt: "Explain HashiCorp Vault's secrets engine types: KV v2 (versioned secrets), database dynamic secrets, and PKI. For a microservices app on Kubernetes, describe how each service authenticates to Vault (Kubernetes auth), retrieves a short-lived DB password, and how Vault Agent Sidecar handles token renewal." },
      { type: "architecture", prompt: "A developer hardcoded an AWS access key in a Git repo. Besides rotating the key, describe how you'd use Vault's AWS secrets engine to generate dynamic, short-lived IAM credentials on demand, attach a least-privilege policy, and enforce TTLs — preventing this problem permanently." },
    ],
  },
  "vue-angular": {
    title: "Vue.js & Angular Challenge", category: "Frontend", points: 30, difficulty: "intermediate",
    description: "Build component-based UIs with Vue 3 (Composition API) or Angular.",
    tasks: [
      { type: "javascript", prompt: "Write a Vue 3 Composition API component `<SearchBox>` that: (1) has a reactive `query` ref, (2) uses `watchEffect` to call a `searchAPI(query)` function when query changes, (3) debounces the API call by 300ms, (4) shows a loading spinner while the API is in-flight, (5) displays results in a list." },
      { type: "architecture", prompt: "Explain Angular's dependency injection system: how `@Injectable({ providedIn: 'root' })` differs from providing a service in a module or component, what the injector hierarchy looks like, and how you'd create a mock service for unit testing with `TestBed`. Compare this to Vue 3's `provide/inject`." },
    ],
  },
  oracle: {
    title: "Oracle Database Challenge", category: "Databases", points: 35, difficulty: "advanced",
    description: "Write advanced Oracle SQL and PL/SQL for enterprise data management.",
    tasks: [
      { type: "sql", prompt: "Write an Oracle PL/SQL procedure `calc_bonus(p_dept_id IN NUMBER)` that: (1) loops through all employees in the given department, (2) gives a 15% bonus if salary < 50000, 10% if between 50000–100000, or 5% if above, (3) updates the `employees` table, (4) commits, and (5) handles exceptions with DBMS_OUTPUT." },
      { type: "architecture", prompt: "Explain Oracle's Automatic Workload Repository (AWR) and Automatic Database Diagnostic Monitor (ADDM). A query is taking 30 seconds. Describe how you'd use EXPLAIN PLAN, SQL Trace (tkprof), and Oracle Enterprise Manager to find whether the bottleneck is a missing index, I/O, or lock contention." },
    ],
  },
  sap: {
    title: "SAP Challenge", category: "Enterprise", points: 35, difficulty: "advanced",
    description: "Understand SAP architecture, ABAP programming, and ERP integration patterns.",
    tasks: [
      { type: "architecture", prompt: "Explain the difference between SAP ECC and SAP S/4HANA. What does the in-memory HANA database change about the data model (e.g. elimination of aggregates, Universal Journal)? What migration paths exist for an on-prem SAP ECC customer moving to S/4HANA?" },
      { type: "architecture", prompt: "Describe how SAP integrates with external systems using three approaches: (1) BAPIs/RFCs for synchronous calls, (2) IDocs for asynchronous message exchange, (3) SAP Integration Suite (formerly Cloud Platform Integration) for modern API-based integration. Give a real business scenario for each." },
    ],
  },
  "jira-agile": {
    title: "Jira & Agile Challenge", category: "Process", points: 20, difficulty: "beginner",
    description: "Apply Agile/Scrum principles and use Jira to manage software projects effectively.",
    tasks: [
      { type: "architecture", prompt: "A sprint is ending Friday and 3 of 8 stories are incomplete. As Scrum Master, walk through: (1) what you do with the incomplete stories in Jira (carry over vs close), (2) how you run the Sprint Review and Retrospective, (3) what metrics (velocity, burndown) you use to improve future sprint planning." },
      { type: "architecture", prompt: "Explain the difference between Scrum and Kanban. Your team works on both planned features and urgent production bugs. Design a hybrid Jira board setup (using epics, story types, priorities, and labels) that handles both workflows without sprint disruption." },
    ],
  },
  "testing-qa": {
    title: "Selenium & Test Automation Challenge", category: "Testing", points: 30, difficulty: "intermediate",
    description: "Design and write automated tests using Selenium, pytest, and the test pyramid.",
    tasks: [
      { type: "python", prompt: "Write a Python Selenium test using pytest and the Page Object Model pattern for a login page. The test should: (1) navigate to the login page, (2) enter valid credentials, (3) assert the dashboard is displayed, (4) clean up (logout). Structure the code with a `LoginPage` class separating locators from test logic." },
      { type: "architecture", prompt: "Explain the test pyramid (unit → integration → E2E). A team has 5 unit tests, 200 integration tests, and 500 Selenium E2E tests — why is this inverted pyramid a problem? How would you restructure the test suite, and which tools (JUnit, pytest, Cypress, Playwright, k6) belong at each level?" },
    ],
  },
  virtualization: {
    title: "VMware & Virtualisation Challenge", category: "Infrastructure", points: 30, difficulty: "intermediate",
    description: "Understand hypervisors, VMware vSphere, and virtualisation concepts.",
    tasks: [
      { type: "architecture", prompt: "Explain the difference between Type 1 (bare-metal) and Type 2 (hosted) hypervisors. Give examples of each and explain why Type 1 (VMware ESXi, Hyper-V, KVM) is preferred in data centres. What is NUMA awareness and why does it matter for VM performance on large hosts?" },
      { type: "architecture", prompt: "A VM on VMware vSphere is showing 'CPU Ready' time of 15% in performance charts. Explain what CPU Ready means, why high values degrade application performance, and 3 remediation steps you'd take (vCPU reduction, DRS migration, host capacity review)." },
    ],
  },
};

// Friendly display names for slugs
const SLUG_DISPLAY: Record<string, string> = {
  "docker-k8s": "Docker & K8s", "spring-boot": "Spring Boot",
  "machine-learning": "ML & AI", "deep-learning": "Deep Learning",
  "data-warehouse": "Data Warehouse", "testing-qa": "Testing & QA",
  "jira-agile": "Jira & Agile", "vue-angular": "Vue & Angular",
  cicd: "CI/CD & DevOps", sre: "SRE & Observability",
  bash: "Bash & Shell", fastapi: "FastAPI", graphql: "GraphQL",
  elasticsearch: "Elasticsearch", rabbitmq: "RabbitMQ",
};
const displayName = (slug: string) => SLUG_DISPLAY[slug] ?? (TECH_CHALLENGES[slug]?.title.replace(" Challenge", "") ?? slug);

const DIFFICULTY_COLOR = { beginner: "#22c55e", intermediate: "#f0b84f", advanced: "#f0748a" };

// Category order for the picker grid
const CATEGORY_ORDER = ["Programming", "Backend", "Frontend", "Databases", "Cloud", "DevOps", "IaC", "Systems", "Messaging", "Search", "Data", "AI/ML", "APIs", "Operations", "Security", "Infrastructure", "Version Control", "Testing", "Enterprise", "Process"];

// ── Score helpers ─────────────────────────────────────────────────────────────

function loadScore(): number { try { return Number(localStorage.getItem("codelab-score") ?? 0); } catch { return 0; } }
function saveScore(s: number) { try { localStorage.setItem("codelab-score", String(s)); } catch { /* noop */ } }
function loadCompleted(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem("codelab-completed") ?? "[]")); } catch { return new Set(); } }
function saveCompleted(s: Set<string>) { try { localStorage.setItem("codelab-completed", JSON.stringify([...s])); } catch { /* noop */ } }

// ── Challenge URL helpers ─────────────────────────────────────────────────────

const VALID_TYPES = new Set(["sql", "python", "javascript", "architecture"]);

function encodeChallenge(c: Challenge): string {
  return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(c)))));
}
function decodeChallenge(param: string): Challenge | null {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(param))))) as Challenge;
    if (!obj.title) return null;
    if (Array.isArray(obj.tabs)) {
      obj.tabs = obj.tabs.filter((t) => t.name && Array.isArray(t.tasks) && t.tasks.some((tk) => VALID_TYPES.has(tk.type)));
      return obj.tabs.length ? obj : null;
    }
    if (Array.isArray(obj.tasks)) {
      obj.tasks = obj.tasks.filter((t) => VALID_TYPES.has(t.type) && t.prompt);
      return obj.tasks.length ? obj : null;
    }
    return null;
  } catch { return null; }
}
function readChallengeFromURL(): Challenge | null {
  const p = new URLSearchParams(window.location.search).get("challenge");
  return p ? decodeChallenge(p) : null;
}
function buildShareURL(c: Challenge) {
  return `${window.location.origin}${window.location.pathname}?challenge=${encodeChallenge(c)}`;
}
function flattenTasks(c: Challenge): ChallengeTask[] {
  if (c.tabs) return c.tabs.flatMap((t) => t.tasks);
  return c.tasks ?? [];
}
function tabOffset(c: Challenge, idx: number) {
  if (!c.tabs) return 0;
  return c.tabs.slice(0, idx).reduce((a, t) => a + t.tasks.length, 0);
}

// ── Display helpers ───────────────────────────────────────────────────────────

const TYPE_META = {
  sql:          { label: "SQL",          lang: "sql",        color: "#5be7d8", icon: "🗄️" },
  python:       { label: "Python",       lang: "python",     color: "#8f7bf0", icon: "🐍" },
  javascript:   { label: "JavaScript",   lang: "javascript", color: "#facc15", icon: "⚡" },
  architecture: { label: "Architecture", lang: "",           color: "#f472b6", icon: "🏗️" },
};
const PLACEHOLDER: Record<ChallengeTask["type"], string> = {
  sql:          "-- Write your SQL query here\nSELECT ...\n",
  python:       "# Write your Python solution here\ndef solution():\n    pass\n",
  javascript:   "// Write your JavaScript solution here\nfunction solution() {\n\n}\n",
  architecture: "Describe your solution here...\n\nApproach:\n- \n\nKey points:\n- ",
};

const TEMPLATE_JSON = JSON.stringify(
  { title: "My Interview Challenge", description: "Complete the tasks below.", tabs: [
    { name: "Tab One", technologies: ["Python"], tasks: [{ type: "python", prompt: "Write a function that…" }] },
    { name: "Tab Two", technologies: ["SQL"],    tasks: [{ type: "sql", prompt: "Write a query to…" }] },
  ], instructions: "Select a tab and complete the task." }, null, 2
);

// ── Sub-components ────────────────────────────────────────────────────────────

function TaskBadge({ type }: { type: ChallengeTask["type"] }) {
  const m = TYPE_META[type];
  return <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: m.color, background: `${m.color}18`, border: `1px solid ${m.color}40`, borderRadius: 6, padding: "3px 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{m.icon} {m.label}</span>;
}

function CodeTaskEditor({ task, idx, value, onChange, done }: { task: ChallengeTask; idx: number; value: string; onChange: (v: string) => void; done: boolean }) {
  const m = TYPE_META[task.type];
  return (
    <div style={{ background: "var(--cin-surface)", border: `1px solid ${done ? m.color + "60" : "var(--cin-border)"}`, borderRadius: 16, overflow: "hidden", transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", gap: 16, padding: "20px 24px 16px", borderBottom: "1px solid var(--cin-border)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--cin-dim)" }}>Task {idx + 1}</span>
            <TaskBadge type={task.type} />
            {done && <span style={{ fontSize: 12, color: "#22c55e" }}>✓ answered</span>}
          </div>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, lineHeight: 1.65, color: "var(--cin-text)", margin: 0 }}>{task.prompt}</p>
        </div>
      </div>
      {task.type === "architecture" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={PLACEHOLDER[task.type]} rows={10}
          style={{ display: "block", width: "100%", background: "#0d0f18", color: "var(--cin-text)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, lineHeight: 1.7, border: "none", outline: "none", resize: "vertical", padding: "18px 24px", boxSizing: "border-box", minHeight: 200 }} />
      ) : (
        <div style={{ height: 240, background: "#0d0f18" }}>
          <Suspense fallback={<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cin-dim)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>Loading editor…</div>}>
            <MonacoEditor height="240px" language={TYPE_META[task.type].lang} value={value} onChange={(v) => onChange(v ?? "")} theme="vs-dark"
              options={{ minimap: { enabled: false }, fontSize: 13, lineHeight: 22, fontFamily: "'JetBrains Mono',monospace", scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, overviewRulerBorder: false, renderLineHighlight: "gutter", wordWrap: "on" }} />
          </Suspense>
        </div>
      )}
    </div>
  );
}

function TabBar({ tabs, activeIdx, onSelect, answers, challenge }: { tabs: ChallengeTab[]; activeIdx: number; onSelect: (i: number) => void; answers: string[]; challenge: Challenge }) {
  return (
    <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2, marginBottom: 28, borderBottom: "1px solid var(--cin-border)", scrollbarWidth: "none" as any }}>
      {tabs.map((tab, i) => {
        const offset = tabOffset(challenge, i);
        const done = tab.tasks.filter((t, ti) => { const a = answers[offset + ti] ?? ""; return a.trim() && a.trim() !== PLACEHOLDER[t.type].trim(); }).length;
        const isActive = i === activeIdx;
        return (
          <button key={i} onClick={() => onSelect(i)} style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? "var(--cin-text)" : "var(--cin-dim)", background: "none", border: "none", borderBottom: isActive ? "2px solid var(--cin-cyan)" : "2px solid transparent", padding: "10px 18px", cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.2s", marginBottom: -1, flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
            {tab.name}
            {done > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />}
          </button>
        );
      })}
    </div>
  );
}

// ── Self-assessment modal ─────────────────────────────────────────────────────

function AssessModal({ points, onRate }: { points: number; onRate: (multiplier: number) => void }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101, width: "min(480px,90vw)", background: "#0d1018", border: "1px solid var(--cin-border-strong)", borderRadius: 20, padding: "36px 32px", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
        <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 700, color: "var(--cin-text)", margin: "0 0 8px", letterSpacing: "-0.015em" }}>How did you do?</h2>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: "var(--cin-dim)", marginBottom: 28, lineHeight: 1.6 }}>Honestly rate your performance — your score will adjust accordingly. Up to <strong style={{ color: "var(--cin-cyan)" }}>{points} pts</strong> available.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { emoji: "🎯", label: "Nailed it", sub: "Confident, complete answers", mult: 1.0, color: "#22c55e" },
            { emoji: "🤔", label: "Got most of it", sub: "A few gaps but solid overall", mult: 0.6, color: "#f0b84f" },
            { emoji: "📚", label: "Need more practice", sub: "Struggled with key parts", mult: 0.2, color: "#f0748a" },
          ].map(({ emoji, label, sub, mult, color }) => (
            <button key={label} onClick={() => onRate(mult)}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", background: `${color}0d`, border: `1px solid ${color}40`, borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${color}20`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = `${color}0d`)}
            >
              <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
              <div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 600, color }}>{label} <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--cin-dim)" }}>(+{Math.round(points * mult)} pts)</span></div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: "var(--cin-dim)" }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Score bump animation ──────────────────────────────────────────────────────

function ScoreBump({ pts }: { pts: number }) {
  return (
    <span style={{ position: "absolute", top: -8, right: -8, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: "#22c55e", animation: "scorebump 1.8s ease forwards", pointerEvents: "none" }}>
      +{pts}
      <style>{`@keyframes scorebump{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-28px)}}`}</style>
    </span>
  );
}

// ── Tech picker ───────────────────────────────────────────────────────────────

function TechPicker({ score, completed, onSelect }: { score: number; completed: Set<string>; onSelect: (slug: string) => void }) {
  const [filter, setFilter] = useState<string>("All");
  const slugs = Object.keys(TECH_CHALLENGES);
  const categories = ["All", ...CATEGORY_ORDER.filter((c) => slugs.some((s) => TECH_CHALLENGES[s].category === c))];
  const visible = filter === "All" ? slugs : slugs.filter((s) => TECH_CHALLENGES[s].category === filter);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "56px 24px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--cin-cyan)", letterSpacing: "0.1em", textTransform: "uppercase" }}>● Code Lab</span>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginTop: 10 }}>
          <div>
            <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 34, fontWeight: 800, color: "var(--cin-text)", letterSpacing: "-0.02em", margin: "0 0 8px", lineHeight: 1.15 }}>
              Choose your challenge
            </h1>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, color: "var(--cin-dim)", margin: 0, lineHeight: 1.6 }}>
              Pick a technology, complete the tasks, rate yourself — earn points.
            </p>
          </div>
          {/* Score badge */}
          <div style={{ background: "var(--cin-surface)", border: "1px solid var(--cin-border-strong)", borderRadius: 14, padding: "12px 22px", textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 800, color: "var(--cin-cyan)", lineHeight: 1 }}>{score}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--cin-dim)", letterSpacing: "0.08em", marginTop: 4 }}>TOTAL SCORE</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--cin-dim)", letterSpacing: "0.06em", marginTop: 2 }}>{completed.size} / {slugs.length} done</div>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: filter === c ? 700 : 400, color: filter === c ? "var(--cin-bg)" : "var(--cin-dim)", background: filter === c ? "var(--cin-cyan)" : "none", border: `1px solid ${filter === c ? "var(--cin-cyan)" : "var(--cin-border)"}`, borderRadius: 20, padding: "5px 14px", cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.04em" }}>
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {visible.map((slug) => {
          const ch = TECH_CHALLENGES[slug];
          const accent = SLUG_ACCENT[slug] ?? "#5be3d8";
          const done = completed.has(slug);
          return (
            <button key={slug} onClick={() => onSelect(slug)}
              style={{ textAlign: "left", background: "var(--cin-surface)", border: `1px solid ${done ? accent + "50" : "var(--cin-border)"}`, borderRadius: 14, padding: "18px 18px 16px", cursor: "pointer", transition: "border-color 0.2s, transform 0.15s", position: "relative" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent + "70"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = done ? accent + "50" : "var(--cin-border)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {done && <span style={{ position: "absolute", top: 10, right: 10, fontSize: 12, color: "#22c55e" }}>✓</span>}
              <div style={{ width: 32, height: 4, borderRadius: 2, background: accent, marginBottom: 14 }} />
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: "var(--cin-text)", marginBottom: 6, lineHeight: 1.3 }}>{displayName(slug)}</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "var(--cin-dim)", marginBottom: 12, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ch.description}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: DIFFICULTY_COLOR[ch.difficulty], background: `${DIFFICULTY_COLOR[ch.difficulty]}15`, border: `1px solid ${DIFFICULTY_COLOR[ch.difficulty]}30`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.04em" }}>{ch.difficulty}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: accent }}>{ch.points} pts</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Create challenge modal ────────────────────────────────────────────────────

function CreateChallengeModal({ onClose, onLoad }: { onClose: () => void; onLoad: (c: Challenge, url: string) => void }) {
  const [json, setJson] = useState(TEMPLATE_JSON);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setError("");
    try {
      const obj = JSON.parse(json) as Challenge;
      if (!obj.title) { setError("JSON must have a title field."); return; }
      if (Array.isArray(obj.tabs)) {
        if (obj.tabs.some((t) => !t.name || !Array.isArray(t.tasks))) { setError('Each tab needs "name" and "tasks".'); return; }
        if (obj.tabs.flatMap((t) => t.tasks).some((t) => !VALID_TYPES.has(t.type))) { setError("Invalid task type. Use: sql, python, javascript, architecture."); return; }
      } else if (Array.isArray(obj.tasks)) {
        if (!obj.tasks.length) { setError("Add at least one task."); return; }
        if (obj.tasks.some((t) => !VALID_TYPES.has(t.type))) { setError("Invalid task type."); return; }
      } else { setError('JSON must have "tabs" or "tasks".'); return; }
      const url = buildShareURL(obj);
      setShareUrl(url);
      onLoad(obj, url);
    } catch { setError("Invalid JSON — check for missing commas or brackets."); }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101, width: "min(680px,92vw)", background: "#0d1018", border: "1px solid var(--cin-border-strong)", borderRadius: 20, padding: "32px", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--cin-cyan)", letterSpacing: "0.1em", textTransform: "uppercase" }}>● Interviewer Tool</span>
            <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 700, color: "var(--cin-text)", margin: "8px 0 4px" }}>Create a custom challenge</h2>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: "var(--cin-dim)", margin: 0 }}>Paste your JSON. Supports flat <code style={{ color: "var(--cin-cyan)", fontSize: 11 }}>tasks</code> and tabbed <code style={{ color: "var(--cin-cyan)", fontSize: 11 }}>tabs</code> format.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--cin-dim)", fontSize: 20, cursor: "pointer", padding: "2px 6px" }}>×</button>
        </div>
        <div style={{ margin: "16px 0 10px", background: "rgba(91,231,216,0.05)", border: "1px solid rgba(91,231,216,0.15)", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--cin-dim)", margin: "0 0 6px" }}>SUPPORTED TASK TYPES</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["sql", "python", "javascript", "architecture"] as const).map((t) => (
              <span key={t} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: TYPE_META[t].color, background: `${TYPE_META[t].color}15`, border: `1px solid ${TYPE_META[t].color}30`, borderRadius: 5, padding: "2px 8px" }}>{t}</span>
            ))}
          </div>
        </div>
        <textarea value={json} onChange={(e) => { setJson(e.target.value); setError(""); setShareUrl(""); }} rows={14} spellCheck={false}
          style={{ display: "block", width: "100%", boxSizing: "border-box", background: "#080b12", color: "var(--cin-text)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, lineHeight: 1.65, border: `1px solid ${error ? "rgba(248,113,113,0.5)" : "var(--cin-border)"}`, borderRadius: 10, padding: "14px 16px", resize: "vertical", outline: "none", marginBottom: 10 }} />
        {error && <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: "#f87171", marginBottom: 10 }}>⚠ {error}</p>}
        {shareUrl && (
          <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#22c55e", marginBottom: 8 }}>✓ LINK READY — SEND TO YOUR CANDIDATE</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input readOnly value={shareUrl} onClick={(e) => (e.target as HTMLInputElement).select()} style={{ flex: 1, background: "#0a0d14", color: "var(--cin-dim)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, border: "1px solid var(--cin-border)", borderRadius: 7, padding: "8px 12px", outline: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
              <button onClick={() => { navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: copied ? "#22c55e" : "var(--cin-bg)", background: copied ? "rgba(34,197,94,0.15)" : "#22c55e", border: copied ? "1px solid #22c55e" : "none", padding: "8px 18px", borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                {copied ? "✓ Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "var(--cin-dim)", background: "none", border: "1px solid var(--cin-border)", padding: "10px 22px", borderRadius: 10, cursor: "pointer" }}>Close</button>
          <button onClick={handleGenerate} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--cin-bg)", background: "linear-gradient(90deg,var(--cin-cyan),var(--cin-violet))", border: "none", padding: "10px 28px", borderRadius: 10, cursor: "pointer" }}>Generate link →</button>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type PageView = "pick" | "challenge";

export default function CodingChallenge() {
  const [, setLocation] = useLocation();

  // Persistent score
  const [score, setScore] = useState(loadScore);
  const [completed, setCompleted] = useState(loadCompleted);
  const [bumpPts, setBumpPts] = useState<number | null>(null);

  // View state
  const urlChallenge = readChallengeFromURL();
  const [view, setView] = useState<PageView>(urlChallenge ? "challenge" : "pick");
  const [activeTechSlug, setActiveTechSlug] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge>(urlChallenge ?? DEFAULT_CHALLENGE);
  const [isCustomURL, setIsCustomURL] = useState(!!urlChallenge);
  const [shareUrl, setShareUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Challenge state
  const [answers, setAnswers] = useState<string[]>(() => flattenTasks(urlChallenge ?? DEFAULT_CHALLENGE).map((t) => PLACEHOLDER[t.type]));
  const [activeTab, setActiveTab] = useState(0);
  const [assessing, setAssessing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { document.title = view === "pick" ? "Code Lab — TechInterviewPrep" : `${challenge.title} — TechInterviewPrep`; }, [view, challenge.title]);

  function pickTech(slug: string) {
    const ch = TECH_CHALLENGES[slug];
    if (!ch) return;
    const c: Challenge = { title: ch.title, description: ch.description, tasks: ch.tasks, instructions: undefined };
    setChallenge(c);
    setActiveTechSlug(slug);
    setIsCustomURL(false);
    setShareUrl("");
    setAnswers(ch.tasks.map((t) => PLACEHOLDER[t.type]));
    setActiveTab(0);
    setAssessing(false);
    setView("challenge");
    window.history.replaceState(null, "", window.location.pathname);
  }

  function loadCustom(c: Challenge, url: string) {
    setChallenge(c);
    setActiveTechSlug(null);
    setIsCustomURL(true);
    setShareUrl(url);
    setAnswers(flattenTasks(c).map((t) => PLACEHOLDER[t.type]));
    setActiveTab(0);
    setAssessing(false);
    setView("challenge");
    window.history.replaceState(null, "", url);
  }

  function handleRate(mult: number) {
    const pts = activeTechSlug ? Math.round(TECH_CHALLENGES[activeTechSlug].points * mult) : 0;
    if (pts > 0) {
      const newScore = score + pts;
      setScore(newScore);
      saveScore(newScore);
      setBumpPts(pts);
      setTimeout(() => setBumpPts(null), 2000);
    }
    if (activeTechSlug) {
      const newCompleted = new Set(completed).add(activeTechSlug);
      setCompleted(newCompleted);
      saveCompleted(newCompleted);
    }
    setAssessing(false);
    setView("pick");
    window.history.replaceState(null, "", window.location.pathname);
  }

  const allTasks = flattenTasks(challenge);
  const completedCount = answers.filter((a, i) => {
    const t = allTasks[i]; if (!t) return false;
    return a.trim() !== "" && a.trim() !== PLACEHOLDER[t.type].trim();
  }).length;
  const allDone = completedCount === allTasks.length;

  function handleAnswer(flatIdx: number, val: string) {
    setAnswers((prev) => { const n = [...prev]; n[flatIdx] = val; return n; });
  }

  // ── Pick view ────────────────────────────────────────────────────────────

  if (view === "pick" && !assessing) {
    return (
      <>
        {showModal && <CreateChallengeModal onClose={() => setShowModal(false)} onLoad={loadCustom} />}
        <div style={{ position: "relative" }}>
          {bumpPts && <ScoreBump pts={bumpPts} />}
          <TechPicker score={score} completed={completed} onSelect={pickTech} />
          {/* Floating create button */}
          <div className="cin-fab" style={{ position: "fixed", bottom: 32, right: 32, zIndex: 10 }}>
            <button onClick={() => setShowModal(true)}
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--cin-bg)", background: "linear-gradient(90deg,var(--cin-cyan),var(--cin-violet))", border: "none", padding: "12px 24px", borderRadius: 12, cursor: "pointer", boxShadow: "0 8px 32px rgba(91,231,216,0.3)" }}>
              ✏️ Create challenge
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Self-assessment ──────────────────────────────────────────────────────

  if (assessing && activeTechSlug) {
    return <AssessModal points={TECH_CHALLENGES[activeTechSlug].points} onRate={handleRate} />;
  }

  // ── Challenge view ───────────────────────────────────────────────────────

  const isTabbedChallenge = Array.isArray(challenge.tabs) && challenge.tabs.length > 0;
  const currentTab = isTabbedChallenge ? challenge.tabs![activeTab] : null;
  const currentTasks = currentTab ? currentTab.tasks : (challenge.tasks ?? []);
  const currentOffset = isTabbedChallenge ? tabOffset(challenge, activeTab) : 0;
  const accent = activeTechSlug ? (SLUG_ACCENT[activeTechSlug] ?? "var(--cin-cyan)") : "var(--cin-cyan)";
  const techChallengeMeta = activeTechSlug ? TECH_CHALLENGES[activeTechSlug] : null;

  return (
    <>
      {showModal && <CreateChallengeModal onClose={() => setShowModal(false)} onLoad={loadCustom} />}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "56px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: isTabbedChallenge ? 32 : 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => { setView("pick"); window.history.replaceState(null, "", window.location.pathname); }} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--cin-dim)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>← Code Lab</button>
              {techChallengeMeta && (
                <>
                  <span style={{ color: "var(--cin-border)" }}>/</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--cin-dim)" }}>{techChallengeMeta.category}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: DIFFICULTY_COLOR[techChallengeMeta.difficulty], background: `${DIFFICULTY_COLOR[techChallengeMeta.difficulty]}15`, border: `1px solid ${DIFFICULTY_COLOR[techChallengeMeta.difficulty]}30`, borderRadius: 5, padding: "2px 8px" }}>{techChallengeMeta.difficulty}</span>
                </>
              )}
              {isCustomURL && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "#8f7bf0", background: "rgba(143,123,240,0.12)", border: "1px solid rgba(143,123,240,0.3)", borderRadius: 6, padding: "2px 10px" }}>Custom challenge</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Score counter */}
              <div style={{ position: "relative", background: "var(--cin-surface)", border: "1px solid var(--cin-border)", borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                {bumpPts && <ScoreBump pts={bumpPts} />}
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: "var(--cin-cyan)" }}>{score} pts</span>
              </div>
              {isCustomURL && shareUrl && (
                <button onClick={() => { navigator.clipboard.writeText(shareUrl).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }); }}
                  style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: linkCopied ? "#22c55e" : "var(--cin-cyan)", background: "none", border: `1px solid ${linkCopied ? "#22c55e" : "var(--cin-cyan)"}`, padding: "8px 14px", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}>
                  {linkCopied ? "✓ Copied!" : "🔗 Copy link"}
                </button>
              )}
              <button onClick={() => setShowModal(true)}
                style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: "var(--cin-bg)", background: "linear-gradient(90deg,var(--cin-cyan),var(--cin-violet))", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
                ✏️ {isCustomURL ? "Edit challenge" : "Create challenge"}
              </button>
            </div>
          </div>

          {/* Points banner for tech challenges */}
          {techChallengeMeta && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: accent }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: accent }}>Up to {techChallengeMeta.points} pts available</span>
            </div>
          )}

          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 34, fontWeight: 800, color: "var(--cin-text)", letterSpacing: "-0.02em", marginBottom: 12, lineHeight: 1.15 }}>{challenge.title}</h1>
          {challenge.description && <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, color: "var(--cin-dim)", lineHeight: 1.65, maxWidth: 640, marginBottom: 18 }}>{challenge.description}</p>}

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: challenge.instructions ? 16 : 0 }}>
            <div style={{ flex: 1, maxWidth: 260, height: 4, background: "var(--cin-border)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${allTasks.length > 0 ? (completedCount / allTasks.length) * 100 : 0}%`, background: `linear-gradient(90deg,${accent},var(--cin-violet))`, transition: "width 0.4s ease", borderRadius: 4 }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--cin-dim)" }}>{completedCount} / {allTasks.length} answered</span>
          </div>

          {challenge.instructions && (
            <div style={{ marginTop: 16, background: "rgba(91,231,216,0.06)", border: "1px solid rgba(91,231,216,0.2)", borderRadius: 10, padding: "12px 18px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: "var(--cin-dim)", lineHeight: 1.6 }}>
              <span style={{ color: "var(--cin-cyan)", fontWeight: 600 }}>Instructions: </span>{challenge.instructions}
            </div>
          )}
        </div>

        {/* Tab bar */}
        {isTabbedChallenge && <TabBar tabs={challenge.tabs!} activeIdx={activeTab} onSelect={setActiveTab} answers={answers} challenge={challenge} />}

        {/* Tech chips */}
        {currentTab?.technologies?.length && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--cin-dim)" }}>Technologies:</span>
            {currentTab.technologies.map((t) => <span key={t} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--cin-text)", background: "var(--cin-surface)", border: "1px solid var(--cin-border)", borderRadius: 6, padding: "3px 10px" }}>{t}</span>)}
          </div>
        )}

        {/* Tasks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {currentTasks.map((task, i) => {
            const flatIdx = currentOffset + i;
            const a = answers[flatIdx] ?? PLACEHOLDER[task.type];
            const done = a.trim() !== "" && a.trim() !== PLACEHOLDER[task.type].trim();
            return <CodeTaskEditor key={`${challenge.title}-${activeTab}-${i}`} task={task} idx={i} value={a} onChange={(v) => handleAnswer(flatIdx, v)} done={done} />;
          })}
        </div>

        {/* Footer nav */}
        {isTabbedChallenge ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--cin-border)" }}>
            <button onClick={() => setActiveTab((p) => Math.max(0, p - 1))} disabled={activeTab === 0}
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: activeTab === 0 ? "var(--cin-border)" : "var(--cin-dim)", background: "none", border: `1px solid ${activeTab === 0 ? "var(--cin-border)" : "var(--cin-border)"}`, padding: "10px 20px", borderRadius: 10, cursor: activeTab === 0 ? "not-allowed" : "pointer" }}>← Previous</button>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--cin-dim)" }}>{activeTab + 1} / {challenge.tabs!.length}</span>
            {activeTab < challenge.tabs!.length - 1 ? (
              <button onClick={() => setActiveTab((p) => p + 1)} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: "var(--cin-cyan)", background: "none", border: "1px solid var(--cin-cyan)", padding: "10px 20px", borderRadius: 10, cursor: "pointer" }}>Next →</button>
            ) : (
              <button onClick={() => activeTechSlug ? setAssessing(true) : undefined} disabled={completedCount === 0}
                style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: completedCount === 0 ? "var(--cin-dim)" : "var(--cin-bg)", background: completedCount === 0 ? "var(--cin-surface)" : `linear-gradient(90deg,${accent},var(--cin-violet))`, border: completedCount === 0 ? "1px solid var(--cin-border)" : "none", padding: "10px 28px", borderRadius: 10, cursor: completedCount === 0 ? "not-allowed" : "pointer" }}>Submit →</button>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, paddingTop: 32, borderTop: "1px solid var(--cin-border)" }}>
            {!allDone && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--cin-dim)" }}>{allTasks.length - completedCount} task{allTasks.length - completedCount !== 1 ? "s" : ""} remaining</span>}
            <button
              onClick={() => { if (activeTechSlug) { setAssessing(true); } else { setView("pick"); } }}
              disabled={completedCount === 0}
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: completedCount === 0 ? "var(--cin-dim)" : "var(--cin-bg)", background: completedCount === 0 ? "var(--cin-surface)" : `linear-gradient(90deg,${accent},var(--cin-violet))`, border: completedCount === 0 ? "1px solid var(--cin-border)" : "none", padding: "12px 32px", borderRadius: 12, cursor: completedCount === 0 ? "not-allowed" : "pointer", transition: "all 0.2s", letterSpacing: "0.02em" }}>
              {activeTechSlug ? (allDone ? "Submit & score →" : "Submit partial →") : "Done →"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Default challenge (fallback) ──────────────────────────────────────────────

const DEFAULT_CHALLENGE: Challenge = {
  title: "Technical Interview Challenge",
  description: "Demonstrate your practical coding and problem-solving skills.",
  tasks: [
    { type: "sql", prompt: "Write an SQL query to find the top 5 customers who placed the highest number of orders in the last year." },
    { type: "python", prompt: "Write a Python function that takes a list of integers and returns the list sorted in descending order without using built-in sort functions." },
    { type: "architecture", prompt: "Draw and explain the architecture of a web application that supports user authentication, a database, and an API layer. Highlight the data flow between components." },
  ],
  instructions: "Complete each task. For architecture questions, describe clearly in text.",
};
