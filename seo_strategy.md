# SEO Strategy — IT Interview Prep (TechInterviewPrep)

## App overview
IT Interview Prep (branded "TechInterviewPrep") is a free, SPA-based technical interview practice platform. Users select a technology (20 courses), pick a difficulty, and answer multiple-choice questions. Features: leaderboard, timed mode, real-time challenge/race mode.

## Rendering mode
Pure SPA — React 19 + Vite + Wouter. All routes (`/`, `/quiz`, `/result`, `/leaderboard`, `/race`, `/about`) are client-rendered. The `index.html` shell is the only HTML returned to crawlers for any route.

## In scope
- All public pages: home (`/`), about (`/about`), leaderboard (`/leaderboard`), race (`/race`)
- The static HTML shell (`artifacts/it-interview-prep/index.html`) which is what social bots and AI crawlers see for every route

## Out of scope
- Quiz session pages (`/quiz`, `/result`) — these are transient, session-gated flows. Not meant to be independently indexed.

## Target audience
- Software engineers, sysadmins, DevOps and cloud professionals preparing for technical interviews
- Students looking to test and reinforce IT knowledge

## Primary keywords
- "IT interview prep", "technical interview practice", "Oracle/SAP/Java/Python/AWS/Linux interview questions", "TechInterviewPrep"

## Dismissed categories
- (None yet)
