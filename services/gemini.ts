/**
 * gemini.ts — Gemini AI service for generating review replies
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_MODEL   = 'gemini-2.0-flash-lite';

export async function generateReplyDraft(params: {
  businessName: string;
  tone: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
}): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const { businessName, tone, reviewerName, rating, reviewText } = params;

  const isNegative = rating <= 3;
  const toneGuide = tone || 'Friendly';

  const prompt = [
    `You are the owner of "${businessName}". Write a reply to this Google review.`,
    '',
    `Reviewer: ${reviewerName}`,
    `Rating: ${rating}/5`,
    `Review: "${reviewText}"`,
    '',
    `Tone: ${toneGuide}`,
    '',
    'Rules:',
    `- Address the reviewer by name ("Hi ${reviewerName}")`,
    '- Keep it 2-4 sentences',
    isNegative
      ? '- Acknowledge their concern, apologize sincerely, and offer to make it right (e.g. "please reach out to us directly")'
      : '- Thank them warmly, reference a specific detail they mentioned, invite them to visit again',
    '- Sound human — not corporate or robotic',
    '- No emojis, no hashtags',
    '- Do NOT use phrases like "We appreciate your feedback" or "Your satisfaction is our priority"',
    '',
    'Output: Reply text only — no labels, no preamble.',
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text.trim();
}
