# IT Interview Prep

An interactive IT interview prep platform where users select a technology (Oracle, SAP, Java, Python, AWS, Linux), pick a difficulty level (Beginner/Intermediate/Advanced), and answer multiple-choice questions in a simulated interview format. The app tracks scores, awards badges, and shows a leaderboard of top scorers.

## Run & Operate

- `pnpm --filter @workspace/it-interview-prep run dev` — run the frontend (port assigned by env)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Tailwind CSS v4, Wouter routing, TanStack Query
- API: Express 5 (artifacts/api-server)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Fonts: Plus Jakarta Sans + JetBrains Mono

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/courses.ts` — DB schema: courses, questions, sessions, leaderboard
- `artifacts/api-server/src/routes/courses.ts` — GET /courses, GET /courses/:id/questions
- `artifacts/api-server/src/routes/sessions.ts` — POST /sessions, POST /sessions/:id/submit
- `artifacts/api-server/src/routes/leaderboard.ts` — GET/POST /leaderboard, GET /leaderboard/stats
- `artifacts/it-interview-prep/src/` — React frontend

## Architecture decisions

- Questions seeded directly via SQL at startup (180 real IT questions: 6 courses × 3 levels × 10 questions)
- Badge system: Bronze ≥50%, Silver ≥70%, Gold ≥85%, Platinum ≥95%
- Quiz state (questions, answers, session) held in React context (QuizContext) across route transitions
- Orval codegen sed post-processes `zod.int()` → `zod.number().int()` for Zod v3 compatibility
- Zod orval client uses `mode: "single"` (no separate types folder) to avoid TS2308 name collisions on path params

## Product

- Home page: Browse 6 IT course cards, click to choose difficulty level
- Quiz page: Interview-style MCQ session, one question at a time with progress bar, instant answer feedback + explanations
- Result page: Score summary, badge awards, per-question breakdown, save to leaderboard
- Leaderboard page: Top scorers filterable by course/level, global stats panel

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run codegen after every OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
- Google Fonts @import MUST be the very first line in index.css (before @import 'tailwindcss')
- The codegen script patches `zod.int()` → `zod.number().int()` via sed to maintain Zod v3 compatibility
- Express 5 wildcard routes need names: use `/{*splat}` not `*`
- req.params values are `string | string[]` — always normalize before parseInt

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
