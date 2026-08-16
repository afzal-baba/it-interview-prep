/**
 * Platform statistics — single source of truth for TypeScript/React code.
 *
 * The canonical DATA lives in platform-stats.json at the artifact root.
 * This file re-exports typed constants from that JSON so components get
 * type-safe access without repeating any numbers.
 *
 * Files that consume these stats:
 *   src/pages/home.tsx                     — hero stats row
 *   src/pages/about.tsx                    — about page stats grid
 *   vite-plugin-route-meta.ts              — SEO meta descriptions
 *
 * Non-TS consumers read platform-stats.json directly:
 *   scripts/generate-route-html.mjs        — post-build static HTML
 *
 * Static assets that embed these numbers (regenerate when they change):
 *   public/og-image.svg                    — social sharing image
 *   index.html                             — JSON-LD + noscript copy
 */

import stats from '../../platform-stats.json';

export const TOTAL_COURSES: number             = stats.TOTAL_COURSES;
export const TOTAL_QUESTIONS: number           = stats.TOTAL_QUESTIONS;
export const TOTAL_QUESTIONS_DISPLAY: string   = stats.TOTAL_QUESTIONS_DISPLAY;
export const QUESTIONS_PER_COURSE: number      = stats.QUESTIONS_PER_COURSE;
export const DIFFICULTY_TIERS: number          = stats.DIFFICULTY_TIERS;
