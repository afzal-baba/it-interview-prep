---
name: Question bank rotation
description: The quiz serves fixed-size rotations from larger imported question pools.
---

Imported question sources are intentionally stored as larger per-course, per-level pools while each quiz and catalog tier stays capped at 10 questions. The browser sends IDs from the previous five rotations so the API can prefer unseen questions and only fall back when a pool is too small.

**Why:** The product needs consistent 10-question quizzes without repeating a question immediately, but several uploaded documents provide overlapping question banks and some existing courses have only small pools.

**How to apply:** Preserve normalized, idempotent question imports and keep future question-list callers compatible with the optional exclusion-ID query parameter.