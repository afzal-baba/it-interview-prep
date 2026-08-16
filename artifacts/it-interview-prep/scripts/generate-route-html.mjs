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

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist', 'public');

// ── Platform stats ────────────────────────────────────────────────────────────
// Read from platform-stats.json — the single source of truth shared with
// src/lib/platform-stats.ts.  Never hardcode numbers here directly.
const stats = JSON.parse(readFileSync(join(ROOT, 'platform-stats.json'), 'utf8'));
const TOTAL_COURSES           = stats.TOTAL_COURSES;
const TOTAL_QUESTIONS_DISPLAY = stats.TOTAL_QUESTIONS_DISPLAY;
// ─────────────────────────────────────────────────────────────────────────────

// ── Route meta ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://techinterviewprep.replit.app';

const ROUTE_META = {
  '/about': {
    title: `About TechInterviewPrep — ${TOTAL_QUESTIONS_DISPLAY} Questions, ${TOTAL_COURSES} Technologies, Free`,
    description:
      `TechInterviewPrep offers ${TOTAL_QUESTIONS_DISPLAY} hand-crafted questions across ${TOTAL_COURSES} technology courses — Docker, AWS, React, Kafka, Vault, and more. Earn Bronze to Platinum badges, climb the leaderboard, and race head-to-head in real-time.`,
    ogTitle: 'About TechInterviewPrep — Free IT Interview Practice Platform',
    ogDescription:
      `${TOTAL_QUESTIONS_DISPLAY} hand-crafted interview questions across ${TOTAL_COURSES} technologies. Timed mode, badge system, global leaderboard, and real-time challenge arena — all free.`,
    ogUrl: `${BASE_URL}/about`,
    canonical: `${BASE_URL}/about`,
  },
  '/leaderboard': {
    title: 'Global Leaderboard — TechInterviewPrep',
    description:
      'See the top IT interview practice scores from engineers worldwide on TechInterviewPrep. Filter by technology, level, or timed mode. Earn Gold and Platinum badges.',
    ogTitle: 'Global IT Interview Leaderboard — TechInterviewPrep',
    ogDescription:
      `Top scores from engineers competing across Docker, Python, AWS, React, Kafka, and ${TOTAL_COURSES - 5} other technology tracks. Climb the ranks and earn badges.`,
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

/**
 * Validate that all static public assets contain the correct course/question
 * counts from platform-stats.json, and do NOT contain stale legacy values.
 *
 * Run before generating per-route HTML so that a stale asset causes an
 * immediate, actionable build failure rather than silent inconsistency.
 *
 * Files checked: public/og-image.svg, public/llms.txt, index.html
 */
function validateStaticAssets() {
  const errors = [];
  const coursesStr = String(TOTAL_COURSES);

  // ── og-image.svg ────────────────────────────────────────────────────────────
  const svgPath = join(ROOT, 'public', 'og-image.svg');
  try {
    const svg = readFileSync(svgPath, 'utf8');
    // Must contain current counts
    if (!svg.includes(`>${TOTAL_COURSES}<`)) {
      errors.push(
        `og-image.svg: missing >${TOTAL_COURSES}< stat. ` +
        `Update the TECHNOLOGIES stat text in public/og-image.svg.`,
      );
    }
    if (!svg.includes(TOTAL_QUESTIONS_DISPLAY)) {
      errors.push(
        `og-image.svg: missing "${TOTAL_QUESTIONS_DISPLAY}". ` +
        `Update the QUESTIONS stat and subtitle text in public/og-image.svg.`,
      );
    }
    // Must NOT contain stale counts in the stat positions
    if (svg.includes('>600<') || svg.includes('>20<')) {
      errors.push(
        `og-image.svg: still contains stale stat values (>600< or >20<). ` +
        `Replace them with ${TOTAL_QUESTIONS_DISPLAY} and ${TOTAL_COURSES} in public/og-image.svg.`,
      );
    }
    if (/\b600 questions\b/i.test(svg) || /across 20 technolog/i.test(svg)) {
      errors.push(
        `og-image.svg: still contains stale text ("600 questions" or "across 20 technolog"). ` +
        `Update the subtitle line in public/og-image.svg.`,
      );
    }
  } catch (e) {
    errors.push(`og-image.svg: could not read file (${e.message})`);
  }

  // ── public/llms.txt ─────────────────────────────────────────────────────────
  const llmsPath = join(ROOT, 'public', 'llms.txt');
  try {
    const llms = readFileSync(llmsPath, 'utf8');
    // Must contain current counts
    if (!llms.includes(coursesStr)) {
      errors.push(
        `llms.txt: does not contain "${coursesStr}" (TOTAL_COURSES). ` +
        `Update the course count in public/llms.txt.`,
      );
    }
    if (!llms.includes(TOTAL_QUESTIONS_DISPLAY)) {
      errors.push(
        `llms.txt: does not contain "${TOTAL_QUESTIONS_DISPLAY}" (TOTAL_QUESTIONS_DISPLAY). ` +
        `Update the question count in public/llms.txt.`,
      );
    }
    // Must NOT contain stale counts
    if (/\b600\b/.test(llms)) {
      errors.push(
        `llms.txt: still contains stale question count "600". ` +
        `Replace with "${TOTAL_QUESTIONS_DISPLAY}" in public/llms.txt.`,
      );
    }
    if (/\b20 (course|technolog)/i.test(llms)) {
      errors.push(
        `llms.txt: still contains stale course/technology count "20". ` +
        `Replace with "${TOTAL_COURSES}" in public/llms.txt.`,
      );
    }
  } catch (e) {
    errors.push(`llms.txt: could not read file (${e.message})`);
  }

  // ── index.html (JSON-LD + noscript) ─────────────────────────────────────────
  const htmlPath = join(ROOT, 'index.html');
  try {
    const html = readFileSync(htmlPath, 'utf8');
    // Must contain current counts
    if (!html.includes(TOTAL_QUESTIONS_DISPLAY)) {
      errors.push(
        `index.html: does not contain "${TOTAL_QUESTIONS_DISPLAY}". ` +
        `Update meta description, JSON-LD, and noscript copy in index.html.`,
      );
    }
    // Detect stale "Browse all N courses" where N ≠ TOTAL_COURSES
    const browseMatch = html.match(/Browse all (\d+) courses/);
    if (browseMatch && browseMatch[1] !== coursesStr) {
      errors.push(
        `index.html: noscript says "Browse all ${browseMatch[1]} courses" ` +
        `but TOTAL_COURSES is ${TOTAL_COURSES}. Update index.html noscript nav.`,
      );
    }
    // Detect ALL occurrences of "across N technolog" and reject any where N ≠ TOTAL_COURSES
    const techMatches = [...html.matchAll(/across (\d+) technolog/gi)];
    for (const m of techMatches) {
      if (m[1] !== coursesStr) {
        errors.push(
          `index.html: found "across ${m[1]} technolog" ` +
          `but TOTAL_COURSES is ${TOTAL_COURSES}. Update all description strings in index.html.`,
        );
        break; // one error message is enough
      }
    }
    // Reject stale "600" question counts
    if (/\b600 (hand-crafted|question)/i.test(html)) {
      errors.push(
        `index.html: still contains stale question count "600". ` +
        `Replace with "${TOTAL_QUESTIONS_DISPLAY}" in index.html.`,
      );
    }
  } catch (e) {
    errors.push(`index.html: could not read file (${e.message})`);
  }

  if (errors.length > 0) {
    throw new Error(
      `[generate-route-html] Static asset validation failed.\n` +
      `Update these files to match platform-stats.json (${ROOT}/platform-stats.json):\n` +
      errors.map(e => `  • ${e}`).join('\n'),
    );
  }

  console.log('✓ Static asset validation passed (og-image.svg, llms.txt, index.html)');
}

// ── Regenerate og-image.png from og-image.svg ─────────────────────────────────
// The SVG is the editable source; the PNG is what index.html actually serves.
// We regenerate the PNG here (mandatory — build fails if ImageMagick is absent)
// so it is always derived from the validated SVG.
//
// Vite copies public/ into dist/public/ before this script runs, so we must
// also overwrite dist/public/og-image.png with the freshly-generated file.
function regenerateOgImagePng() {
  const svgPath = join(ROOT, 'public', 'og-image.svg');
  const srcPngPath = join(ROOT, 'public', 'og-image.png');
  const distPngPath = join(DIST, 'og-image.png');

  // Try `magick` (IMv7) then `convert` (IMv6).
  let generated = false;
  for (const bin of ['magick', 'convert']) {
    try {
      const cmd = `${bin} -background "#05070C" -density 150 "${svgPath}" -resize 1200x630 "${srcPngPath}"`;
      execSync(cmd, { stdio: 'pipe' });
      generated = true;
      console.log(`✓ Regenerated public/og-image.png from og-image.svg (via ${bin})`);
      break;
    } catch {
      // try next binary
    }
  }

  if (!generated) {
    throw new Error(
      '[generate-route-html] Could not regenerate og-image.png: ImageMagick not found.\n' +
      'Install ImageMagick and re-run this script, or regenerate the PNG manually:\n' +
      `  magick -background "#05070C" -density 150 public/og-image.svg -resize 1200x630 public/og-image.png`,
    );
  }

  // Overwrite dist/public/og-image.png — Vite copied a stale version before
  // this script ran; replace it with the freshly-generated file.
  try {
    copyFileSync(srcPngPath, distPngPath);
    console.log('✓ Copied regenerated og-image.png → dist/public/og-image.png');
  } catch {
    // dist may not exist yet (e.g. during a non-build run); that is fine.
    console.log('  (dist/public/og-image.png not present — skipping dist copy)');
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

// 1. Validate static assets — fail fast if counts are stale
validateStaticAssets();

// 2. Regenerate og-image.png from the validated SVG so it is always in sync
regenerateOgImagePng();

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
