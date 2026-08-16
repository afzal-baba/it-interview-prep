/**
 * vite-plugin-route-meta
 *
 * Injects per-route <title>, <meta name="description">, Open Graph tags, Twitter
 * Card tags, and a <link rel="canonical"> into the served HTML based on the
 * requested URL path.
 *
 * In Vite dev mode  → the `transformIndexHtml` hook fires for every request,
 *   so crawlers and social bots that do not execute JavaScript get the correct
 *   metadata for every public route instead of the generic SPA shell.
 *
 * In Vite build mode → transformIndexHtml runs once for the root index.html
 *   entry (path === '/').  A companion post-build script
 *   (scripts/generate-route-html.mjs) produces per-route static HTML files
 *   inside dist/public/.
 */

import type { Plugin } from 'vite';
import { TOTAL_COURSES, TOTAL_QUESTIONS_DISPLAY } from './src/lib/platform-stats';

const BASE_URL = 'https://techinterviewprep.replit.app';

interface RouteMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  canonical: string;
}

/** Routes that must not be indexed (session-gated, no meaningful static content). */
const NOINDEX_ROUTES = new Set(['/quiz', '/result']);

export const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: 'TechInterviewPrep — Ace Your Next Technical Interview',
    description:
      `Master technical interviews with ${TOTAL_QUESTIONS_DISPLAY} hand-crafted questions across ${TOTAL_COURSES} technologies. Choose Docker, Python, AWS, React, Kafka, and more — with timed mode and a real-time challenge arena.`,
    ogTitle: 'TechInterviewPrep — Ace Your Next Technical Interview',
    ogDescription:
      `Master technical interviews with ${TOTAL_QUESTIONS_DISPLAY} hand-crafted questions across ${TOTAL_COURSES} technologies. Timed mode, global leaderboard, and real-time head-to-head challenge arena.`,
    ogUrl: `${BASE_URL}/`,
    canonical: `${BASE_URL}/`,
  },

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
      `See the top IT interview practice scores from engineers worldwide on TechInterviewPrep. Filter by technology, level, or timed mode. Earn Gold and Platinum badges.`,
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

/** Returns the best-matching RouteMeta for a given URL path. */
export function getRouteMeta(path: string): RouteMeta {
  // Normalise: strip query string and trailing slash (keep root as-is)
  const normalised =
    path === '/'
      ? '/'
      : path.split('?')[0].replace(/\/$/, '');
  return ROUTE_META[normalised] ?? ROUTE_META['/'];
}

/** Replace a single <meta> attribute value in raw HTML. */
function replaceMeta(
  html: string,
  selector: string,
  value: string,
): string {
  // selector is something like `name="description"` or `property="og:title"`
  const re = new RegExp(
    `(<meta\\s[^>]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*content=")([^"]*)(")`,
    'i',
  );
  if (re.test(html)) {
    return html.replace(re, `$1${value}$3`);
  }
  // Also try content before attribute order is reversed
  const re2 = new RegExp(
    `(<meta\\s[^>]*content=")([^"]*)("[^>]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*)`,
    'i',
  );
  return html.replace(re2, `$1${value}$3`);
}

/** Inject per-route meta into a raw index.html string. */
export function injectRouteMeta(html: string, urlPath: string): string {
  // Session-gated pages: replace robots tag with noindex so they are never
  // indexed by crawlers (they have no meaningful static content).
  const normalised =
    urlPath === '/' ? '/' : urlPath.split('?')[0].replace(/\/$/, '');
  if (NOINDEX_ROUTES.has(normalised)) {
    html = html.replace(
      /<meta name="robots" content="[^"]*"/,
      `<meta name="robots" content="noindex, nofollow"`,
    );
    return html;
  }

  const meta = getRouteMeta(urlPath);

  // <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);

  // <meta name="description">
  html = replaceMeta(html, 'name="description"', meta.description);

  // OG tags
  html = replaceMeta(html, 'property="og:title"', meta.ogTitle);
  html = replaceMeta(html, 'property="og:description"', meta.ogDescription);
  html = replaceMeta(html, 'property="og:url"', meta.ogUrl);

  // Twitter Card tags
  html = replaceMeta(html, 'name="twitter:title"', meta.ogTitle);
  html = replaceMeta(html, 'name="twitter:description"', meta.ogDescription);

  // <link rel="canonical">
  const canonicalTag = `<link rel="canonical" href="${meta.canonical}" />`;
  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, canonicalTag);
  } else {
    html = html.replace('</head>', `  ${canonicalTag}\n  </head>`);
  }

  return html;
}

/** The Vite plugin. */
export function routeMetaPlugin(): Plugin {
  return {
    name: 'route-meta',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        // In Vite dev mode, `ctx.path` is the HTML file path (e.g. "/index.html"),
        // while `ctx.originalUrl` is the actual browser request URL (e.g. "/about").
        // In build mode both are the entry file; we fall back to "/" in that case.
        const ctx2 = ctx as { path?: string; originalUrl?: string };
        const urlPath = ctx2.originalUrl ?? ctx2.path ?? '/';
        return injectRouteMeta(html, urlPath);
      },
    },
  };
}
