/**
 * Deepgram Speech-to-Text service using the nova-3 model.
 * Sends raw audio bytes to the v1/listen REST endpoint.
 */

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen";

export interface TranscriptionResult {
  transcript: string;
  detectedLanguage: string;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<TranscriptionResult> {
  if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === "your_deepgram_api_key") {
    throw new Error("DEEPGRAM_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    model: "nova-3",
    detect_language: "true",
    smart_format: "true",
  });

  const response = await fetch(`${DEEPGRAM_URL}?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": mimeType || "audio/webm",
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `Deepgram API error (HTTP ${response.status}): ${errBody}`
    );
  }

  const data = await response.json();

  const channel = data?.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];
  const transcript = alternative?.transcript ?? "";
  const detectedLanguage =
    channel?.detected_language ||
    data?.results?.channels?.[0]?.detected_language ||
    "en";

  return { transcript, detectedLanguage };
}
