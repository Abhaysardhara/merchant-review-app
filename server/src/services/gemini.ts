/**
 * Gemini review generation service using gemini-2.5-flash via @google/genai.
 * Takes a raw transcript and produces a polished 5-star Google review.
 */

import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface GenerateReviewInput {
  transcript: string;
  detectedLanguage: string;
  merchantKeywords: string;
  merchantTone: string;
  businessName: string;
}

interface GeminiReviewOutput {
  reviewText: string;
  detectedLanguage: string;
}

export async function generateReview(
  input: GenerateReviewInput
): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key") {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const systemPrompt = buildSystemPrompt(input);
  const userPrompt = buildUserPrompt(input);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reviewText: { type: Type.STRING },
          detectedLanguage: { type: Type.STRING },
        },
        required: ["reviewText", "detectedLanguage"],
      },
      temperature: 1.0,
      maxOutputTokens: 400,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed: GeminiReviewOutput = JSON.parse(text);
  return parsed.reviewText;
}

function buildSystemPrompt(input: GenerateReviewInput): string {
  const lines = [
    "You are a review polishing assistant. Your job is to take a raw voice transcript from a real customer and transform it into a polished, natural-sounding 5-star Google review.",
    "",
    "Rules:",
    "- Detect the spoken language of the transcript. If it is non-English, translate the core meaning into natural, authentic English. If the merchant has a target language preference, match that instead.",
    "- Remove all filler words (um, uh, like, you know, so, basically), stutters, false starts, and repetitions.",
    "- Produce a crisp, enthusiastic 2-3 sentence review that reads like a genuine 5-star Google review.",
    "- Write in first person, past tense, with natural contractions.",
    "- The tone should feel authentic and personal — not robotic or overly polished.",
  ];

  if (input.merchantKeywords) {
    lines.push(
      `- Naturally weave in 1-2 of these merchant keywords where relevant: ${input.merchantKeywords}`
    );
  }

  if (input.merchantTone) {
    lines.push(`- Match this tone: ${input.merchantTone}`);
  }

  if (input.businessName) {
    lines.push(
      `- Reference the business name "${input.businessName}" naturally in the review.`
    );
  }

  lines.push(
    "",
    "- No emojis, no hashtags, no star symbols.",
    '- BANNED phrases: "exceeded my expectations", "highly recommend", "must-visit", "without hesitation", "truly exceptional", "five stars", "top-notch", "gem", "world-class".',
    "",
    "Return ONLY the JSON object with reviewText and detectedLanguage."
  );

  return lines.join("\n");
}

function buildUserPrompt(input: GenerateReviewInput): string {
  return [
    "Transform this voice transcript into a polished 5-star Google review:",
    "",
    `Transcript: "${input.transcript}"`,
    "",
    `Detected spoken language: ${input.detectedLanguage}`,
  ].join("\n");
}
