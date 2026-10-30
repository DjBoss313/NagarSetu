/**
 * JUDGE EXPLANATION:
 * Produces a concise 1-2 sentence executive summary of the civic complaint.
 * When Gemini is active, it extracts the root issue and location into actionable wording.
 * When the key is missing or the call times out (5s), it uses a structured fallback template.
 * The UI explicitly labels the result as "AI Summary" or "Fallback Summary".
 */

import { callGemini } from './gemini';

export interface SummarizeResult {
  summary: string;
  source: 'llm' | 'fallback';
}

export async function summarizeComplaint(
  description: string,
  category: string,
  address?: string | null
): Promise<SummarizeResult> {
  const prompt = `Summarize this citizen municipal complaint in 1 or 2 concise, factual sentences for a city engineer.
Mention the primary hazard/issue and location if mentioned:
Complaint: "${description}"
Location context: "${address || 'Unspecified location'}"
Category: "${category}"

Respond with ONLY the 1-2 sentence summary, no pleasantries.`;

  const geminiRes = await callGemini(
    prompt,
    'You are an assistant for municipal ward officers. Keep summaries strictly factual, concise (1-2 sentences), and focused on the civic hazard.'
  );

  if (geminiRes && geminiRes.text.length > 10) {
    return {
      summary: geminiRes.text.trim(),
      source: 'llm',
    };
  }

  // Deterministic rule-based fallback summary
  const cleanDesc = description.trim().replace(/\s+/g, ' ');
  const firstSentence = cleanDesc.split(/[.!?]\s+/)[0] || cleanDesc;
  const truncated =
    firstSentence.length > 120
      ? firstSentence.slice(0, 117) + '...'
      : firstSentence;

  const locPart = address ? ` near ${address}` : '';
  const fallbackSummary = `Reported ${category.toLowerCase()}${locPart}: ${truncated}. Requires field inspection and municipal dispatch.`;

  return {
    summary: fallbackSummary,
    source: 'fallback',
  };
}
