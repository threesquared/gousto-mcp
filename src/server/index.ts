import express from "express";
import SSEServer from "./sse";
import StreamableServer from "./streamable";

export function createApp() {
  const app = express();
  app.use(express.json());

  const sseServer = new SSEServer(app);
  const streamableServer = new StreamableServer(app);

  async function shutdown() {
    await sseServer.shutdown();
    await streamableServer.shutdown();
  }

  return { app, shutdown };
}
