---
name: Protected admin caching
description: Why authenticated admin JSON requests disable HTTP and browser caching
---
Protected admin JSON endpoints should send `Cache-Control: no-store`, and their browser fetches should use `cache: "no-store"`.

**Why:** Express/browser freshness handling can turn a successful authenticated request into a `304 Not Modified` response with no JSON body, causing `response.json()` to fail even when authorization succeeded.

**How to apply:** Use no-store on private moderation, dashboard, or other stateful admin reads and mutations; do not rely on cache validators for these responses.