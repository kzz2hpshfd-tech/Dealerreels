import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type VibeCandidate = {
  id: string;
  caption: string;
  model: string;
  tags: string[];
};

/**
 * Asks Claude to rank videos against a free-text "vibe" query and return
 * a match score (0-100) for each. Falls back gracefully if the model
 * output can't be parsed.
 */
export async function rankByVibe(query: string, candidates: VibeCandidate[]) {
  if (!query.trim() || candidates.length === 0) return candidates.map((c) => ({ id: c.id, score: null }));

  const prompt = `You are ranking short car-sales videos against a shopper's free-text "vibe" search.
Query: "${query}"

Videos (JSON):
${JSON.stringify(candidates, null, 2)}

Return ONLY a JSON array, no prose, no markdown fences, like:
[{"id":"<video id>","score":<0-100 integer>}]

Score reflects how well the video matches the vibe of the query (mood, use-case, lifestyle — not just literal keyword overlap).`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return candidates.map((c) => ({ id: c.id, score: null }));

  try {
    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as { id: string; score: number }[];
  } catch {
    return candidates.map((c) => ({ id: c.id, score: null }));
  }
}
