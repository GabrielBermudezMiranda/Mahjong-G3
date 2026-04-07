import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { setupSocket } from "./socket";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

setupSocket(io);

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log("Server is running on http://localhost:3000");
});
