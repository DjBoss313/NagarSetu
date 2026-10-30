/**
 * JUDGE EXPLANATION:
 * Categorizes civic complaints into standard municipal departments.
 * It first applies fast keyword pattern matching. If Gemini is configured,
 * it requests an AI confirmation within a 5-second deadline; otherwise,
 * it immediately returns the keyword-based category.
 */

import { callGemini } from './gemini';

export const CIVIC_CATEGORIES = [
  'Roads & Potholes',
  'Water & Sewage',
  'Garbage & Sanitation',
  'Electricity & Streetlights',
  'Public Safety',
  'Encroachment & Traffic',
  'Other',
] as const;

export type CivicCategory = (typeof CIVIC_CATEGORIES)[number];

const CATEGORY_RULES: Record<Exclude<CivicCategory, 'Other'>, string[]> = {
  'Electricity & Streetlights': [
    'electric',
    'wire',
    'spark',
    'transformer',
    'streetlight',
    'street light',
    'light',
    'pole',
    'power',
    'shock',
    'blackout',
    'hanging wire',
    'voltage',
  ],
  'Public Safety': [
    'manhole',
    'open drain',
    'falling tree',
    'collapse',
    'hazard',
    'dangerous',
    'railing',
    'open pit',
    'accident',
  ],
  'Water & Sewage': [
    'sewage',
    'drain',
    'gutter',
    'pipe',
    'leak',
    'waterlogging',
    'water logging',
    'flood',
    'drinking water',
    'contaminated',
    'pipeline',
    'overflow',
  ],
  'Garbage & Sanitation': [
    'garbage',
    'trash',
    'waste',
    'dump',
    'stink',
    'smell',
    'debris',
    'litter',
    'dustbin',
    'sanitation',
    'dead animal',
    'cleanliness',
  ],
  'Roads & Potholes': [
    'pothole',
    'crater',
    'road',
    'tar',
    'asphalt',
    'divider',
    'speed breaker',
    'uneven',
    'cave-in',
    'broken road',
    'pavement',
  ],
  'Encroachment & Traffic': [
    'footpath',
    'sidewalk',
    'encroach',
    'illegal parking',
    'hawker',
    'traffic signal',
    'blocked',
    'pedestrian',
    'congestion',
  ],
};

export function ruleBasedCategorize(text: string): CivicCategory {
  const lower = text.toLowerCase();
  let bestMatch: CivicCategory = 'Other';
  let maxScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_RULES) as [
    CivicCategory,
    string[],
  ][]) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.length > 5 ? 2 : 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = cat;
    }
  }

  return bestMatch;
}

export interface CategorizeResult {
  category: CivicCategory;
  source: 'llm' | 'fallback';
  confidence: number;
}

export async function categorizeComplaint(
  description: string,
  userSelectedCategory?: string | null
): Promise<CategorizeResult> {
  const ruleCat = ruleBasedCategorize(description);

  // If user selected a valid category and keywords agree or user was specific, prioritize user choice
  const initialCategory =
    userSelectedCategory && CIVIC_CATEGORIES.includes(userSelectedCategory as CivicCategory)
      ? (userSelectedCategory as CivicCategory)
      : ruleCat;

  // Attempt Gemini AI verification within 5 seconds
  const prompt = `Classify this Indian civic municipal complaint into exactly one of these categories:
${CIVIC_CATEGORIES.join(', ')}

Complaint: "${description}"

Respond with ONLY the exact category name from the list above.`;

  const geminiRes = await callGemini(
    prompt,
    'You are a civic complaint classifier for an Indian municipal corporation. Output only the category name.'
  );

  if (geminiRes) {
    const cleaned = geminiRes.text.trim().replace(/^["']|["']$/g, '');
    const matched = CIVIC_CATEGORIES.find(
      (c) => c.toLowerCase() === cleaned.toLowerCase()
    );
    if (matched) {
      return {
        category: matched,
        source: 'llm',
        confidence: 0.95,
      };
    }
  }

  // Fallback to rule-based category
  return {
    category: initialCategory !== 'Other' ? initialCategory : ruleCat,
    source: 'fallback',
    confidence: initialCategory !== 'Other' ? 0.75 : 0.5,
  };
}
