import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type VibeCandidate = {
  id: string;
  caption: string;
  model: string;
  tags: string[];
};

// Plain keyword overlap between the query and a candidate's caption/model/tags.
// Used whenever the AI ranking call can't be trusted (missing/invalid API key,
// rate limit, network error, unparseable output) so a search still visibly
// reorders results instead of silently doing nothing -- returning score: null
// for every candidate leaves the list in its original order, which looks
// exactly like search is broken even though a request did go out.
function keywordScore(query: string, candidate: VibeCandidate) {
  const words = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (words.length === 0) return 0;
  const haystack = `${candidate.caption} ${candidate.model} ${candidate.tags.join(" ")}`.toLowerCase();
  const hits = words.filter((w) => haystack.includes(w)).length;
  return Math.round((hits / words.length) * 100);
}

/**
 * Asks Claude to rank videos against a free-text "vibe" query and return
 * a match score (0-100) for each. Falls back to plain keyword matching if
 * the model call or its output can't be used.
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

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return candidates.map((c) => ({ id: c.id, score: keywordScore(query, c) }));
    }

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { id: string; score: number }[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return candidates.map((c) => ({ id: c.id, score: keywordScore(query, c) }));
    }
    return parsed;
  } catch (err) {
    // An invalid/missing API key, a rate limit, a malformed response -- none
    // of these should 500 the whole search or leave it looking like a no-op.
    // Fall back to keyword matching so the feed still visibly reorders.
    console.error("vibe search ranking failed, falling back to keyword match:", err);
    return candidates.map((c) => ({ id: c.id, score: keywordScore(query, c) }));
  }
}
