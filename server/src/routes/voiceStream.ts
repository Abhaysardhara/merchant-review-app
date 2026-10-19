/**
 * WebSocket proxy: Browser ↔ Backend ↔ Deepgram
 *
 * Flow:
 * 1. Browser opens WS to our backend at /api/v1/voice-stream
 * 2. Backend opens WS to Deepgram nova-3 with streaming config
 * 3. Browser sends audio chunks → backend forwards to Deepgram
 * 4. Deepgram sends transcript events → backend forwards to browser
 * 5. Browser sends "finalize" message → backend closes Deepgram connection
 */

import { WebSocket, type RawData } from "ws";
import type { IncomingMessage } from "http";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

export function handleVoiceStreamUpgrade(
  ws: WebSocket,
  _req: IncomingMessage
): void {
  if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === "your_deepgram_api_key") {
    ws.send(JSON.stringify({ type: "error", message: "Deepgram not configured" }));
    ws.close();
    return;
  }

  // Build Deepgram WS URL with query params
  const params = new URLSearchParams({
    model: "nova-3",
    language: "multi",
    smart_format: "true",
    interim_results: "true",
    utterance_end_ms: "1500",
    vad_events: "true",
  });

  const dgUrl = `${DEEPGRAM_WS_URL}?${params}`;
  const dgWs = new WebSocket(dgUrl, {
    headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
  });

  let dgOpen = false;

  dgWs.on("open", () => {
    dgOpen = true;
    ws.send(JSON.stringify({ type: "ready" }));
  });

  dgWs.on("message", (data: RawData) => {
    // Forward Deepgram transcript events to the browser
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "Results") {
        const alt = msg.channel?.alternatives?.[0];
        if (!alt) return;

        ws.send(
          JSON.stringify({
            type: "transcript",
            transcript: alt.transcript || "",
            is_final: msg.is_final || false,
            speech_final: msg.speech_final || false,
            detected_language: msg.channel?.detected_language || "",
          })
        );
      } else if (msg.type === "UtteranceEnd") {
        ws.send(JSON.stringify({ type: "utterance_end" }));
      }
    } catch {
      // Ignore unparseable messages
    }
  });

  dgWs.on("error", (err) => {
    console.error("[voice-stream] Deepgram WS error:", err.message);
    ws.send(JSON.stringify({ type: "error", message: "Deepgram connection error" }));
    ws.close();
  });

  dgWs.on("close", () => {
    dgOpen = false;
    // Don't close browser WS here — let the browser decide when it's done
  });

  // Handle messages from browser
  ws.on("message", (data: RawData, isBinary: boolean) => {
    if (isBinary) {
      // Binary = audio chunk → forward to Deepgram
      if (dgOpen) {
        dgWs.send(data);
      }
    } else {
      // Text = control message
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "finalize") {
          // Tell Deepgram we're done sending audio
          if (dgOpen) {
            dgWs.send(JSON.stringify({ type: "CloseStream" }));
          }
        }
      } catch {
        // Ignore
      }
    }
  });

  ws.on("close", () => {
    if (dgOpen) {
      dgWs.close();
    }
  });

  ws.on("error", () => {
    if (dgOpen) {
      dgWs.close();
    }
  });
}
