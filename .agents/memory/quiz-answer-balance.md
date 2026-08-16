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
