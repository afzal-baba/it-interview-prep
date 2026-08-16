#!/usr/bin/env node
/**
 * Post-build script: generate per-route static HTML files.
 *
 * After `vite build`, the output is a single dist/public/index.html that every
 * route shares.  This script copies that file to per-route sub-directories with
 * correct per-route <title>, <meta>, OG, and canonical tags so that static
 * hosts (and crawlers that cache responses) see route-specific metadata.
 *
 * Resulting files:
 *   dist/public/index.html              → /   (unchanged)
 *   dist/public/about/index.html        → /about
 *   dist/public/leaderboard/index.html  → /leaderboard
 *   dist/public/race/index.html         → /race
 *
 * Usage:  node scripts/generate-route-html.mjs
 * (run from the artifacts/it-interview-prep directory)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist', 'public');

// ── Route meta ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://techinterviewprep.replit.app';

const ROUTE_META = {
  '/about': {
    title: 'About TechInterviewPrep — 1200 Questions, 40 Technologies, Free',
    description:
      'TechInterviewPrep offers 600 hand-crafted questions across 20 technology courses — Docker, AWS, Python, SQL, Kubernetes, and more. Earn Bronze to Platinum badges, climb the leaderboard, and race head-to-head in real-time.',
    ogTitle: 'About TechInterviewPrep — Free IT Interview Practice Platform',
    ogDescription:
      '600 hand-crafted interview questions across 20 technologies. Timed mode, badge system, global leaderboard, and real-time challenge arena — all free.',
    ogUrl: `${BASE_URL}/about`,
    canonical: `${BASE_URL}/about`,
  },
  '/leaderboard': {
    title: 'Global Leaderboard — TechInterviewPrep',
    description:
      'See the top IT interview practice scores from engineers worldwide on TechInterviewPrep. Filter by technology, level, or timed mode. Earn Gold and Platinum badges.',
    ogTitle: 'Global IT Interview Leaderboard — TechInterviewPrep',
    ogDescription:
      'Top scores from engineers competing across Docker, Python, AWS, and 17 other technology tracks. Climb the ranks and earn badges.',
    ogUrl: `${BASE_URL}/leaderboard`,
    canonical: `${BASE_URL}/leaderboard`,
  },
  '/race': {
    title: 'Challenge Arena — Real-Time IT Quiz Battles | TechInterviewPrep',
    description:
      'Race head-to-head against other engineers in real-time IT interview quizzes. Same questions, same clock — fastest correct answer wins each round.',
    ogTitle: 'Challenge Arena — Real-Time IT Quiz Battles',
    ogDescription:
      'Head-to-head real-time IT interview quiz battles on TechInterviewPrep. Pick your tech, find an opponent, and race the clock.',
    ogUrl: `${BASE_URL}/race`,
    canonical: `${BASE_URL}/race`,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function replaceMeta(html, selector, value) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(<meta\\s[^>]*${escaped}[^>]*content=")([^"]*)(")`,
    'i',
  );
  if (re.test(html)) return html.replace(re, `$1${value}$3`);
  const re2 = new RegExp(
    `(<meta\\s[^>]*content=")([^"]*)("[^>]*${escaped}[^>]*)`,
    'i',
  );
  return html.replace(re2, `$1${value}$3`);
}

function injectMeta(html, route, meta) {
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
  html = replaceMeta(html, 'name="description"', meta.description);
  html = replaceMeta(html, 'property="og:title"', meta.ogTitle);
  html = replaceMeta(html, 'property="og:description"', meta.ogDescription);
  html = replaceMeta(html, 'property="og:url"', meta.ogUrl);
  html = replaceMeta(html, 'name="twitter:title"', meta.ogTitle);
  html = replaceMeta(html, 'name="twitter:description"', meta.ogDescription);

  const canonicalTag = `<link rel="canonical" href="${meta.canonical}" />`;
  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, canonicalTag);
  } else {
    html = html.replace('</head>', `  ${canonicalTag}\n  </head>`);
  }

  return html;
}

// ── Assertions ────────────────────────────────────────────────────────────────

function assertContains(html, route, needle, label) {
  if (!html.includes(needle)) {
    throw new Error(`[generate-route-html] ${route}: missing expected ${label}: ${needle}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const baseHtml = readFileSync(join(DIST, 'index.html'), 'utf8');

for (const [route, meta] of Object.entries(ROUTE_META)) {
  const routeDir = join(DIST, route.slice(1)); // strip leading slash
  mkdirSync(routeDir, { recursive: true });

  const html = injectMeta(baseHtml, route, meta);
  const outPath = join(routeDir, 'index.html');

  // ── Assertions: verify every critical tag was written correctly ───────────
  assertContains(html, route, `<title>${meta.title}</title>`, '<title>');
  assertContains(html, route, `content="${meta.description}"`, 'meta description');
  assertContains(html, route, `content="${meta.ogTitle}"`, 'og:title');
  assertContains(html, route, `content="${meta.ogDescription}"`, 'og:description');
  assertContains(html, route, `content="${meta.ogUrl}"`, 'og:url');
  assertContains(html, route, `href="${meta.canonical}"`, 'canonical');

  writeFileSync(outPath, html, 'utf8');
  console.log(`✓ Generated ${outPath} (title: "${meta.title}")`);
}

console.log('✓ Per-route HTML generation complete.');
