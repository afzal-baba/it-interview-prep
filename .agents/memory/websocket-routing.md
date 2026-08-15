---
name: WebSocket routing through the preview proxy
description: Durable routing rule for real-time endpoints behind the shared path-based proxy
---

The shared preview proxy forwards WebSocket upgrades and does NOT strip the artifact path prefix. Any WS endpoint must handle upgrades at the full prefixed path (e.g. `/api/...`), and clients should connect same-origin (`ws(s)://${location.host}/api/...`), never to a hardcoded dev domain.

**Why:** unprefixed upgrade paths or dev-domain URLs silently fail through the proxy.

**How to apply:** when adding any real-time feature, attach the WS server to the existing HTTP server and match the prefixed pathname on upgrade.
