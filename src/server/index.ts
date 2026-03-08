import express from "express";
import SSEServer from "./sse";
import StreamableServer from "./streamable";

// Create the Express app
export function createApp() {
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

  const sseServer = new SSEServer(app);
  const streamableServer = new StreamableServer(app);

  async function shutdown() {
    await sseServer.shutdown();
    await streamableServer.shutdown();
  }

  return { app, shutdown };
}
