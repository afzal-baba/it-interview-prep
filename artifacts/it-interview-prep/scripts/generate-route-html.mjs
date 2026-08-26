#!/usr/bin/env node

import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");
const PUBLIC = join(ROOT, "public");
const DIST = join(ROOT, "dist", "public");
const DEFAULT_SITE_URL = "https://techinterviewprep.replit.app";
const PRODUCTION_SITE_URL = "https://mockinterviewprep.app";

const stats = JSON.parse(readFileSync(join(ROOT, "platform-stats.json"), "utf8"));
const totalQuestions = stats.TOTAL_QUESTIONS_DISPLAY ?? `${Number(stats.TOTAL_QUESTIONS).toLocaleString("en-US")}+`;
const totalTech = String(stats.TOTAL_COURSES);
const courseSlugs = stats.COURSE_SLUGS ?? [];
const siteUrl = (
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.NODE_ENV === "development" ? DEFAULT_SITE_URL : PRODUCTION_SITE_URL)
).replace(/\/+$/, "");

if (!courseSlugs.length) {
  throw new Error("platform-stats.json must include COURSE_SLUGS so the sitemap stays complete.");
}

const countPhrase = `${totalQuestions} hand-crafted questions across ${totalTech} technologies`;
const homeDescription = `Master technical interviews with ${countPhrase} and use 12 free ATS resume templates for Docker, Python, AWS, React, Kafka, and more.`;

const routeMeta = {
  "/": {
    title: `TechInterviewPrep — ${totalQuestions} IT Interview Questions + Free Resume Builder`,
    description: homeDescription,
    ogTitle: `TechInterviewPrep — ${totalQuestions} IT Interview Questions + Free Resume Builder`,
    ogDescription: homeDescription,
  },
  "/about": {
    title: `About — Features, Badges & All ${totalTech} Courses | TechInterviewPrep`,
    description: `Explore TechInterviewPrep: ${countPhrase} across Docker, AWS, React, Kafka, Vault, and more. Earn badges, climb the leaderboard, and practice for free.`,
    ogTitle: `About TechInterviewPrep — ${totalTech} Free IT Courses`,
    ogDescription: `Explore ${countPhrase}, badge progress, timed practice, and real-time interview challenges.`,
  },
  "/leaderboard": {
    title: "Global Leaderboard — Top IT Interview Scorers | TechInterviewPrep",
    description: `See top IT interview practice scores from engineers worldwide across ${totalTech} technologies and ${totalQuestions} in the TechInterviewPrep question bank.`,
    ogTitle: "Global IT Interview Leaderboard — TechInterviewPrep",
    ogDescription: `Compare scores across ${totalTech} technologies with ${totalQuestions} available practice questions.`,
  },
  "/resume-builder": {
    title: "Free Resume Builder — 12 ATS Templates | TechInterviewPrep",
    description: `Build an ATS-friendly resume with 12 free templates and interview-verified skills, alongside ${countPhrase}.`,
    ogTitle: "Free ATS Resume Builder — TechInterviewPrep",
    ogDescription: `Create a polished resume with 12 free ATS templates and skills from ${countPhrase}.`,
  },
  "/resume-templates": {
    title: "12 Free ATS Resume Templates | TechInterviewPrep",
    description: `Browse 12 distinct free ATS resume templates for technical interviews, from minimalist and timeline layouts to creative and corporate designs. ${countPhrase}.`,
    ogTitle: "12 Free ATS Resume Templates — TechInterviewPrep",
    ogDescription: `Choose a distinct free resume template and continue in the TechInterviewPrep Resume Builder. ${countPhrase}.`,
  },
  "/race": {
    title: "Challenge Arena — Real-time Head-to-Head IT Quiz Battles",
    description: `Race head-to-head in real-time IT interview quizzes using the ${totalQuestions} question bank across ${totalTech} technologies.`,
    ogTitle: "Challenge Arena — Real-Time IT Quiz Battles",
    ogDescription: `Challenge other engineers across ${totalTech} technologies with ${totalQuestions} timed, head-to-head interview quizzes.`,
  },
  "/admin/community": {
    title: "Community Moderation — TechInterviewPrep",
    description: `Review and moderate community-submitted technical interview questions from the ${totalQuestions} question bank across ${totalTech} technologies.`,
    ogTitle: "Community Moderation — TechInterviewPrep",
    ogDescription: `Review and moderate community-submitted technical interview questions from the ${totalQuestions} question bank across ${totalTech} technologies.`,
  },
};

function displayName(slug) {
  const names = {
    "active-directory": "Active Directory",
    "argocd-gitops": "Argo CD & GitOps",
    "cicd": "CI/CD",
    "data-viz": "Data Visualization",
    "dbt": "dbt",
    "docker-k8s": "Docker & Kubernetes",
    "dotnet-csharp": ".NET & C#",
    "gcp": "Google Cloud",
    "kubernetes-adv": "Kubernetes",
    "llm-apis": "LLM APIs",
    "mlops": "MLOps",
    "nestjs": "NestJS",
    "nodejs": "Node.js",
    "opentelemetry": "OpenTelemetry",
    "postgresql": "PostgreSQL",
    "prometheus-grafana": "Prometheus & Grafana",
    "react-native": "React Native",
    "spring-boot": "Spring Boot",
    "testing-qa": "Testing & QA",
    "vector-databases": "Vector Databases",
    "vue-angular": "Vue & Angular",
  };
  return names[slug] ?? slug.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function replaceFirst(html, pattern, value) {
  return html.replace(pattern, () => value);
}

function replaceMeta(html, attribute, value) {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(<meta\\s[^>]*${escaped}[^>]*content=")([^"]*)(")`, "i");
  if (matcher.test(html)) return html.replace(matcher, (_, prefix, _old, suffix) => `${prefix}${value}${suffix}`);
  return html;
}

function injectMeta(html, route, meta) {
  const url = `${siteUrl}${route === "/" ? "/" : route}`;
  html = replaceFirst(html, /<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);
  html = replaceMeta(html, 'name="description"', meta.description);
  html = replaceMeta(html, 'property="og:title"', meta.ogTitle);
  html = replaceMeta(html, 'property="og:description"', meta.ogDescription);
  html = replaceMeta(html, 'property="og:url"', url);
  html = replaceMeta(html, 'property="og:image"', `${siteUrl}/og-image.png`);
  html = replaceMeta(html, 'name="twitter:title"', meta.ogTitle);
  html = replaceMeta(html, 'name="twitter:description"', meta.ogDescription);
  html = replaceMeta(html, 'name="twitter:image"', `${siteUrl}/og-image.png`);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${url}" />`);
  html = html.replaceAll("{{TOTAL_QUESTIONS}}", totalQuestions);
  html = html.replaceAll("{{TOTAL_TECH}}", totalTech);
  html = html.replaceAll("{{SITE_URL}}", siteUrl);
  return html;
}

function aboutNoscript() {
  const links = courseSlugs.map((slug) => `<li><a href="/courses/${slug}">${displayName(slug)} interview questions</a></li>`).join("");
  return `<div style="max-width:960px;margin:0 auto;padding:2rem;font-family:sans-serif;color:#111">
    <h1>About TechInterviewPrep — Free IT Interview Practice</h1>
    <p>${countPhrase}. Browse ${totalTech} technology courses, earn badges, and prepare with timed quizzes.</p>
    <nav aria-label="About and course navigation"><ul>${links}</ul></nav>
  </div>`;
}

function leaderboardNoscript() {
  const rows = [
    ["1", "Alex", "Python", "100%", "Platinum"],
    ["2", "Sam", "AWS", "98%", "Gold"],
    ["3", "Jordan", "React", "96%", "Gold"],
    ["4", "Taylor", "Docker", "94%", "Silver"],
    ["5", "Riley", "Kubernetes", "92%", "Silver"],
    ["6", "Morgan", "JavaScript", "91%", "Silver"],
    ["7", "Casey", "SQL", "89%", "Bronze"],
    ["8", "Avery", "Git", "88%", "Bronze"],
    ["9", "Jamie", "Kafka", "86%", "Bronze"],
    ["10", "Drew", "Terraform", "84%", "Bronze"],
  ];
  const tableRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("");
  return `<div style="max-width:960px;margin:0 auto;padding:2rem;font-family:sans-serif;color:#111">
    <h1>Global IT Interview Leaderboard</h1>
    <p>Top practice scores across ${totalTech} technologies and ${totalQuestions}. Filter by technology, level, or timed mode in the interactive leaderboard.</p>
    <table><caption>Example top scores</caption><thead><tr><th>Rank</th><th>User</th><th>Technology</th><th>Score</th><th>Badge</th></tr></thead><tbody>${tableRows}</tbody></table>
  </div>`;
}

function replaceNoscript(html, content) {
  return html.replace(/<noscript>\s*<div[\s\S]*?<\/div>\s*<\/noscript>/i, `<noscript>${content}</noscript>`);
}

function validateTemplate(html) {
  const required = ["{{TOTAL_QUESTIONS}}", "{{TOTAL_TECH}}", "{{SITE_URL}}"];
  for (const token of required) {
    if (!html.includes(token)) throw new Error(`index.html is missing template token ${token}`);
  }
}

function validateCounts(html, label) {
  if (html.includes("{{")) throw new Error(`${label} still contains an unresolved template token`);
  for (const expected of [totalQuestions, totalTech]) {
    if (!html.includes(expected)) throw new Error(`${label} is missing platform count ${expected}`);
  }
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1] ?? "";
  const descriptions = [
    ["meta description", html.match(/<meta name="description" content="([^"]*)"/i)?.[1]],
    ["og description", html.match(/<meta property="og:description" content="([^"]*)"/i)?.[1]],
    ["twitter description", html.match(/<meta name="twitter:description" content="([^"]*)"/i)?.[1]],
    ["JSON-LD description", jsonLd],
    ["noscript copy", html.match(/<noscript>([\s\S]*?)<\/noscript>/i)?.[1]],
  ];
  for (const [name, content] of descriptions) {
    if (!content?.includes(totalQuestions) || !content.includes(totalTech)) {
      throw new Error(`${label}: ${name} does not contain ${totalQuestions} and ${totalTech}`);
    }
  }
}

function writePublicTextAssets() {
  const sitemapEntries = [
    ["", "weekly", "1.0"],
    ["/about", "monthly", "0.8"],
    ["/leaderboard", "daily", "0.7"],
    ["/race", "monthly", "0.6"],
    ["/resume-builder", "monthly", "0.9"],
    ["/resume-templates", "monthly", "0.9"],
    ...courseSlugs.map((slug) => [`/courses/${slug}`, "monthly", "0.7"]),
  ].map(([path, changefreq, priority]) => `  <url><loc>${siteUrl}${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`).join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`;
  const llms = `# TechInterviewPrep\n\n> TechInterviewPrep: Free IT interview practice with ${totalQuestions} questions across ${totalTech} technologies, including Docker, Python, AWS, React, Kafka, Vault, and more.\n\n## Pages\n\n- /: Home — browse ${totalTech} IT courses and start practicing\n- /about: Features, badges, and all ${totalTech} courses\n- /leaderboard: Global leaderboard of top scorers\n- /race: Real-time head-to-head challenge arena\n${courseSlugs.map((slug) => `- /courses/${slug}: ${displayName(slug)} interview questions`).join("\n")}\n`;
  writeFileSync(join(PUBLIC, "sitemap.xml"), sitemap);
  writeFileSync(join(PUBLIC, "llms.txt"), llms);
  writeFileSync(join(PUBLIC, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
  for (const filename of ["sitemap.xml", "llms.txt", "robots.txt"]) copyFileSync(join(PUBLIC, filename), join(DIST, filename));
}

function regenerateSocialImages() {
  const svgPath = join(PUBLIC, "og-image.svg");
  try {
    execFileSync("convert", ["-background", "#05070C", "-density", "150", svgPath, "-resize", "1200x630", "-depth", "8", "-strip", "-define", "png:compression-level=9", join(PUBLIC, "og-image.png")]);
    execFileSync("convert", [join(PUBLIC, "og-image.png"), "-quality", "88", join(PUBLIC, "og-image.jpg")]);
  } catch {
    throw new Error("ImageMagick is required to generate public/og-image.png and public/og-image.jpg.");
  }
  copyFileSync(join(PUBLIC, "og-image.png"), join(DIST, "og-image.png"));
  copyFileSync(join(PUBLIC, "og-image.jpg"), join(DIST, "og-image.jpg"));
  const imageInfo = statSync(join(PUBLIC, "og-image.png"));
  if (imageInfo.size >= 300_000) throw new Error(`og-image.png must be under 300KB; got ${imageInfo.size} bytes`);
}

const template = readFileSync(join(ROOT, "index.template.html"), "utf8");
validateTemplate(template);
const baseHtml = readFileSync(join(DIST, "index.html"), "utf8");
writePublicTextAssets();
regenerateSocialImages();

for (const [route, meta] of Object.entries(routeMeta)) {
  let html = injectMeta(baseHtml, route, meta);
  if (route === "/about") html = replaceNoscript(html, aboutNoscript());
  if (route === "/leaderboard") html = replaceNoscript(html, leaderboardNoscript());
  validateCounts(html, route);
  const outputDir = route === "/" ? DIST : join(DIST, route.slice(1));
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "index.html"), html);
}

console.log(`Injected ${totalQuestions} / ${totalTech} into ${Object.keys(routeMeta).length} routes, sitemap + llms validated`);