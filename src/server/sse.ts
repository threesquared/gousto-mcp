import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMcpServer } from "../mcp.js";
import express from "express";

export default class SSEServer {
  private transportMap = new Map<string, SSEServerTransport>();
  private app: express.Application;

  constructor(app: express.Application) {
    this.app = app;

    this.registerRoutes();
  }

  private registerRoutes() {
    this.app.get("/sse", async (req, res) => {
      const transport = new SSEServerTransport("/messages", res);

      this.transportMap.set(transport.sessionId, transport);

      res.on("close", () => {
        this.transportMap.delete(transport.sessionId);
      });

      await createMcpServer().connect(transport);
    });

    this.app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId;

      if (!sessionId || typeof sessionId !== "string") {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const transport = this.transportMap.get(sessionId);

      if (!transport) {
        return res.status(404).json({ error: "Session not found" });
      }

      await transport.handlePostMessage(req, res, req.body);
    });
  }

  public async shutdown() {
    for (const [sessionId, transport] of this.transportMap) {
      await transport.close();
      this.transportMap.delete(sessionId);
    }
  }
}
