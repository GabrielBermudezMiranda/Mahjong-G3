import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { setupSocket } from "./socket";

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN;
const allowedOrigins = clientOrigin
  ? clientOrigin.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["http://localhost:3000", "http://localhost:5173"];
const port = Number(process.env.PORT ?? 3001);

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
  },
});

setupSocket(io);

httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
