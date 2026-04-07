import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { setupSocket } from "./socket";

const app = express();

const defaultOrigin = "http://localhost:5173";
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? process.env.CORS_ORIGIN ?? defaultOrigin)
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
  },
});

setupSocket(io);

const PORT = Number(process.env.PORT ?? 3000);

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
