---
name: Replit Auth setup quirks
description: Naming collisions and codegen rules to respect when touching auth or the OpenAPI spec
---

- The auth session store table is named `auth_sessions` (exported as `authSessionsTable`) because the quiz domain already owns a `sessions` table. The copied server template imports it as `authSessionsTable as sessionsTable`.
  **Why:** the stock Replit Auth template names its table `sessions`, which collides.
  **How to apply:** any new auth-related storage should avoid the `sessions` name.
- `@workspace/api-zod` manually exports the `AuthUser` type (derived from the generated `GetCurrentAuthUserResponse`) in `src/index.ts` — codegen does not emit named types, so don't reduce index.ts to a bare re-export.
- The OpenAPI spec is the single source of truth. Manually written client modules (like the old codelab-progress one) must be deleted once the endpoints are added to the spec, or codegen typecheck fails with duplicate exports. Spec must avoid `format: uri`/`format: email` — orval emits `zod.url()`/`zod.email()` which don't exist in zod v3.
- Web artifact typecheck has ~4 pre-existing errors (calendar.tsx, spinner.tsx, coding-challenge cast, home.tsx queryKey) unrelated to auth work.
