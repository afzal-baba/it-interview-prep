import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();
const usage = new Map<string, { day: string; count: number }>();
const STOP_WORDS = new Set("a an and are as at be by for from has have in is it of on or that the their this to with you your".split(" "));

function limitFor(req: Parameters<typeof router.post>[1] extends never ? never : any): boolean {
  const key = String(req.ip ?? "anonymous");
  const day = new Date().toISOString().slice(0, 10);
  const current = usage.get(key);
  if (!current || current.day !== day) {
    usage.set(key, { day, count: 1 });
    return true;
  }
  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}

function words(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? [])].filter((word) => !STOP_WORDS.has(word));
}

function fallbackMatch(jobDescription: string, resume: string) {
  const jobWords = words(jobDescription);
  const resumeWords = new Set(words(resume));
  const matched_keywords = jobWords.filter((word) => resumeWords.has(word)).slice(0, 30);
  const missing_keywords = jobWords.filter((word) => !resumeWords.has(word)).slice(0, 30);
  return { matched_keywords, missing_keywords, suggested_additions: missing_keywords.slice(0, 5).map((keyword) => `Mention hands-on experience with ${keyword} where it is accurate.`) };
}

async function askClaude(prompt: string, json = false): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8192,
    ...(json ? { system: "Return ONLY valid JSON. No markdown fences or preamble." } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  return block?.type === "text" ? block.text.trim() : "";
}

function cleanJson(text: string): string {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");
  return objectStart >= 0 && objectEnd > objectStart ? cleaned.slice(objectStart, objectEnd + 1) : cleaned;
}

function fallbackBullets(technology: string, context: string): string[] {
  const stack = technology || "technical systems";
  const detail = context ? ` for ${context.slice(0, 90)}` : "";
  return [
    `Applied ${stack} practices${detail}, improving reliability and maintainability.`,
    `Built and supported ${stack} workflows with clear documentation and repeatable processes.`,
    `Collaborated with teammates to troubleshoot ${stack} issues and deliver production-ready changes.`,
  ];
}

router.post("/resume-ai", async (req, res): Promise<void> => {
  if (!limitFor(req)) {
    res.status(429).json({ error: "Daily resume-AI limit reached. Try again tomorrow." });
    return;
  }
  const action = typeof req.body?.action === "string" ? req.body.action : "";
  const context = typeof req.body?.context === "string" ? req.body.context.trim().slice(0, 3000) : "";
  const technology = typeof req.body?.technology === "string" ? req.body.technology.trim().slice(0, 100) : "";
  const resume = typeof req.body?.resume === "string" ? req.body.resume.trim().slice(0, 12000) : "";
  const jobDescription = typeof req.body?.jobDescription === "string" ? req.body.jobDescription.trim().slice(0, 12000) : "";
  if (!["bullets", "match", "insert"].includes(action)) {
    res.status(400).json({ error: "Unsupported resume AI action." });
    return;
  }

  if (action === "match" && (!jobDescription || !resume)) {
    res.status(400).json({ error: "Job description and resume content are required." });
    return;
  }
  try {
    if (action === "bullets") {
      const raw = await askClaude(`Create 3–5 concise, metric-oriented, ATS-friendly resume bullets in active voice.
Technology: ${technology || "the user's technology"}
Role/seniority and context: ${context || "not provided"}
Return JSON only as {"bullets":["..."]}. Never invent metrics; use [X] placeholders when a metric is unknown.`);
      const parsed = JSON.parse(cleanJson(raw)) as { bullets?: unknown };
      const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.filter((item): item is string => typeof item === "string").slice(0, 5) : [];
      res.json({ bullets: bullets.length ? bullets : fallbackBullets(technology, context), fallback: !bullets.length });
      return;
    }
    if (action === "insert") {
      const keyword = typeof req.body?.keyword === "string" ? req.body.keyword.trim().slice(0, 100) : "";
      const raw = await askClaude(`Write one concise, ATS-friendly resume bullet that naturally includes the keyword "${keyword}".
Use only this resume context and do not invent achievements: ${resume}
Return JSON only as {"bullet":"..."}. Use [X] placeholders for missing metrics.`);
      const parsed = JSON.parse(cleanJson(raw)) as { bullet?: unknown };
      res.json({ bullet: typeof parsed.bullet === "string" ? parsed.bullet : "" });
      return;
    }
    const fallback = fallbackMatch(jobDescription, resume);
    const raw = await askClaude(`Compare this resume to this job description.
Return JSON only as {"matched_keywords":["..."],"missing_keywords":["..."],"suggested_additions":["..."]}.
Only include meaningful technical or role keywords.
RESUME:
${resume}
JOB DESCRIPTION:
${jobDescription}`, true);
    const parsed = JSON.parse(cleanJson(raw)) as Partial<typeof fallback>;
    res.json({
      matched_keywords: Array.isArray(parsed.matched_keywords) ? parsed.matched_keywords.filter((item): item is string => typeof item === "string").slice(0, 30) : fallback.matched_keywords,
      missing_keywords: Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords.filter((item): item is string => typeof item === "string").slice(0, 30) : fallback.missing_keywords,
      suggested_additions: Array.isArray(parsed.suggested_additions) ? parsed.suggested_additions.filter((item): item is string => typeof item === "string").slice(0, 10) : fallback.suggested_additions,
    });
  } catch {
    if (action === "match") {
      res.json(fallbackMatch(jobDescription, resume));
      return;
    }
      if (action === "bullets") {
        res.json({ bullets: fallbackBullets(technology, context), fallback: true });
        return;
      }
      if (action === "insert") {
        res.json({ bullet: `Used ${typeof req.body?.keyword === "string" ? req.body.keyword : "relevant technologies"} to deliver reliable, maintainable solutions.`, fallback: true });
        return;
      }
      res.status(503).json({ error: "Resume AI is temporarily unavailable. Please retry." });
  }
});

export default router;