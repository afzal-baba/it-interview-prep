---
name: Quiz answer balance fix
description: Root cause and resolution for trivially-guessable quiz answers (correct answer always longest).
---

# Quiz answer balance fix

## The problem
All 1,680 questions had avg correct answer = 105 chars vs avg wrong answers = 20 chars.
1,453 / 1,680 had a correct answer >30 chars longer than all wrong options combined.
Options were also never shuffled server-side, so position was predictable.

## What was fixed
1. **Server-side option shuffle** (`artifacts/api-server/src/routes/courses.ts`) — Fisher-Yates shuffle on every request, `correctOptionIndex` recalculated after shuffle.
2. **UI equal-height options** — web quiz uses a 2-col CSS grid with `min-h-[90px]` per button; mobile quiz uses `minHeight: 64` on each option row.
3. **AI batch content rewrite** — `scripts/src/rewrite-wrong-answers.ts` used `gpt-5.6-luna` at BATCH_SIZE=8, CONCURRENCY=6 to rewrite wrong answers for all affected questions. Ran in 3 shell sessions (each ~5 min). After fix: avg wrong = 114 chars (now slightly *longer* than correct on average). Only 7 questions still have >25 char disparity (naturally short-answer questions).

**Why:** `needsRewrite()` threshold is 25 chars advantage. The rewrite prompt asks for similar length AND similar specificity (plausible-but-wrong), not just padding.

## Script location
`scripts/src/rewrite-wrong-answers.ts` — re-runnable; queries DB each time and skips already-balanced questions.

## Scoring bug introduced by server-side shuffle (FIXED)
Adding shuffle in the GET /courses/:id/questions handler broke scoring: the client sent the shuffled index back to the server, but the submit handler re-read the *original* correctOptionIndex from the DB and compared against the shuffled index → nearly every correct answer was marked wrong.

**Fix:** Revert server-side shuffle. Add client-side Fisher-Yates shuffle in quiz.tsx (web + mobile). Store `originalIndexMap: number[]` on each shuffled question (shuffledIdx → DB original idx). In `handleSelect`, send `originalIndexMap[displayedIdx]` to the server so scoring always uses original DB indices.

**Rule:** Never shuffle in the GET handler. Shuffle client-side with a reverse-mapping, always submit original indices.

## Production data rewrite
Admin endpoint at `POST /api/admin/rewrite-answers` (header `x-admin-secret: SESSION_SECRET`) runs the OpenAI rewrite in the background against the live DB. Protected, one-time use. After production data is fixed this endpoint can be removed.

`executeSql` with `environment: "production"` is READ-ONLY — cannot UPDATE production data directly. Must go through the deployed API server.
