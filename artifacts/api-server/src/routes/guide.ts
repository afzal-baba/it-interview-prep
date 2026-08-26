import { Router } from "express";
import { db, coursesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai as gemini } from "@workspace/integrations-gemini-ai";

const router = Router();
type GuideTurn = { role: "user" | "assistant"; content: string };

function promptFor(message: string, catalog: string, history: GuideTurn[]): string {
  return `You are one member of a panel helping a beginner use TechInterviewPrep.
Recommend the best starting point for the user's goal. Be practical and concise, mention
specific available course names when relevant, and ask at most one useful follow-up question.
Do not claim to know personal data or location.
Available courses: ${catalog}

Conversation:
${history.slice(-8).map((item) => `${item.role}: ${item.content.slice(0, 600)}`).join("\n")}

User's latest question: ${message}`;
}

async function askOpenAI(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

async function askAnthropic(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  return block?.type === "text" ? block.text.trim() : "";
}

async function askGemini(prompt: string): Promise<string> {
  const response = await gemini.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  return response.text?.trim() ?? "";
}

router.post("/guide", async (req, res): Promise<void> => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 600) : "";
  const history: Array<{ role: string; content: string }> = Array.isArray(req.body?.history)
    ? req.body.history
        .filter((item: unknown): item is { role: string; content: string } =>
          Boolean(item && typeof item === "object" && "role" in item && "content" in item &&
            typeof (item as { role: unknown }).role === "string" &&
            typeof (item as { content: unknown }).content === "string"))
        .slice(-8)
    : [];

  if (!message) {
    res.status(400).json({ error: "A question is required." });
    return;
  }

  try {
    const courses = await db.select({ name: coursesTable.name, slug: coursesTable.slug, category: coursesTable.category })
      .from(coursesTable);
    const catalog = courses.map((course) => `${course.name} (${course.category}, /${course.slug})`).join(", ");
    const prompt = promptFor(message, catalog, history.map((item) => ({
      role: item.role === "assistant" ? "assistant" as const : "user" as const,
      content: item.content,
    })));
    const panel = await Promise.allSettled([askOpenAI(prompt), askAnthropic(prompt), askGemini(prompt)]);
    const suggestions = panel
      .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled" && Boolean(result.value))
      .map((result) => result.value);

    if (suggestions.length === 0) {
      res.status(503).json({ error: "The study guide is temporarily unavailable." });
      return;
    }

    const synthesisPrompt = `You are the lead study guide. Combine the panel suggestions below into one
clear, friendly answer to the user's latest question. Prefer advice shared by multiple models,
resolve contradictions using the course catalog, and keep the answer under 180 words. Include
a short numbered plan or a direct recommendation. Ask at most one follow-up question.

Course catalog: ${catalog}
User question: ${message}

Panel suggestions:
${suggestions.map((suggestion, index) => `Advisor ${index + 1}:\n${suggestion}`).join("\n\n")}`;
    const reply = await askOpenAI(synthesisPrompt);
    res.json({ reply: reply || suggestions[0] });
  } catch (error) {
    console.error("Guide response failed", error);
    res.status(503).json({ error: "The study guide is temporarily unavailable." });
  }
});

export default router;