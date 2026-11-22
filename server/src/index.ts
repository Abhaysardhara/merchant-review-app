import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { WebSocketServer } from "ws";
import { isAllowedOrigin } from "./config";
import { aiLimiter, generalLimiter, placesLimiter, sessionLimiter } from "./middleware/limits";
import { requireSession, verifySessionToken } from "./middleware/session";
import { sessionRouter } from "./routes/session";
import { placesRouter } from "./routes/places";
import { reviewRouter } from "./routes/review";
import { analyticsRouter } from "./routes/analytics";
import { feedbackRouter } from "./routes/feedback";
import { handleVoiceStreamUpgrade } from "./routes/voiceStream";

const app = express();
const PORT = process.env.PORT || 3000;

// Render (and most hosts) sit behind one proxy; needed for correct client IPs.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    // Requests without an Origin (curl, health checks) get no CORS headers.
    origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)),
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "X-Session-Token"],
    maxAge: 600,
  })
);
app.use(express.json({ limit: "50kb" }));
app.use(generalLimiter);

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Customer session for one branch (needed by every route below)
app.use("/api/v1/session", sessionLimiter, sessionRouter);

// Google Places proxy (keeps API key server-side)
app.use("/api/v1/places", requireSession, placesLimiter, placesRouter);

// AI review drafts (prompts are built on the server)
app.use("/api/v1/review", requireSession, aiLimiter, reviewRouter);

// Analytics writes and private feedback
app.use("/api/v1/merchants", requireSession, analyticsRouter);
app.use("/api/v1/merchants", requireSession, feedbackRouter);

// Malformed JSON and other errors
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === "entity.parse.failed" || err?.type === "entity.too.large") {
    res.status(400).json({ success: false, error: "Invalid request body" });
    return;
  }
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// WebSocket server for voice streaming (Deepgram proxy)
const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const session = verifySessionToken(url.searchParams.get("session"));

  if (
    url.pathname !== "/api/v1/voice-stream" ||
    !isAllowedOrigin(req.headers.origin) ||
    !session
  ) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    handleVoiceStreamUpgrade(ws, req, session);
  });
});
