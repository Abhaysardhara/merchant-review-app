import "dotenv/config";
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { voiceReviewRouter } from "./routes/voiceReview";
import { branchesRouter } from "./routes/branches";
import { placesRouter } from "./routes/places";
import { reviewRouter } from "./routes/review";
import { analyticsRouter } from "./routes/analytics";
import { feedbackRouter } from "./routes/feedback";
import { handleVoiceStreamUpgrade } from "./routes/voiceStream";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Merchant branch config
app.use("/api/v1/merchants", branchesRouter);

// Google Places proxy (keeps API key server-side)
app.use("/api/v1/places", placesRouter);

// AI review generation (keeps Gemini key server-side)
app.use("/api/v1/review", reviewRouter);

// Analytics writes (keeps Firestore writes server-side)
app.use("/api/v1/merchants", analyticsRouter);

// Private feedback submission
app.use("/api/v1/merchants", feedbackRouter);

// Voice-to-review (Deepgram STT + Gemini)
app.use("/api/v1/merchants", voiceReviewRouter);

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// WebSocket server for voice streaming (Deepgram proxy)
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);

  if (url.pathname === "/api/v1/voice-stream") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      handleVoiceStreamUpgrade(ws, req);
    });
  } else {
    socket.destroy();
  }
});
