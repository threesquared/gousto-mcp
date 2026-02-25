import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../mcp.js";
import express from "express";
import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export default class StreamableServer {
  private transportMap = new Map<string, StreamableHTTPServerTransport>();
  private app: express.Application;

  constructor(app: express.Application) {
    this.app = app;

    this.registerRoutes();
  }

  private registerRoutes() {
    this.app.post("/mcp", async (req, res) => {
      const sessionHeader = req.headers["mcp-session-id"];
      const sessionId = Array.isArray(sessionHeader)
        ? sessionHeader[0]
        : sessionHeader;

      try {
        if (sessionId && this.transportMap.has(sessionId)) {
          const transport = this.transportMap.get(sessionId)!;
          await transport.handleRequest(req, res, req.body);
          return;
        }

        if (!sessionId && this.isInitializeRequest(req.body)) {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
          });

          transport.onclose = () => {
            if (transport.sessionId) {
              this.transportMap.delete(transport.sessionId);
            }
          };

          await createMcpServer().connect(transport);
          await transport.handleRequest(req, res, req.body);

          if (transport.sessionId) {
            this.transportMap.set(transport.sessionId, transport);
          }
          return;
        }

        return res
          .status(400)
          .json({ error: "Bad Request: invalid session ID or method." });
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error." });
        }
        return;
      }
    });

    this.app.get("/mcp", async (req, res) => {
      const sessionHeader = req.headers["mcp-session-id"];
      const sessionId = Array.isArray(sessionHeader)
        ? sessionHeader[0]
        : sessionHeader;

      if (!sessionId || !this.transportMap.has(sessionId)) {
        return res.status(400).json({ error: "Invalid or missing session ID" });
      }

      const transport = this.transportMap.get(sessionId)!;
      await transport.handleRequest(req, res);
    });

    this.app.delete("/mcp", async (req, res) => {
      const sessionHeader = req.headers["mcp-session-id"];
      const sessionId = Array.isArray(sessionHeader)
        ? sessionHeader[0]
        : sessionHeader;

      if (!sessionId || !this.transportMap.has(sessionId)) {
        res.status(400).json({ error: "Invalid or missing session ID" });
        return;
      }

      try {
        const transport = this.transportMap.get(sessionId)!;
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error("Error handling session termination:", error);
        if (!res.headersSent) {
          res
            .status(500)
            .json({ error: "Error processing session termination" });
        }
      }
    });
  }

  // Check if the request is an initialize request
  private isInitializeRequest(body: any): boolean {
    const isInitial = (data: any) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };
    if (Array.isArray(body)) {
      return body.some((request) => isInitial(request));
    }
    return isInitial(body);
  }

  // Server shutdown
  public async shutdown() {
    for (const [sessionId, transport] of this.transportMap) {
      await transport.close();
      this.transportMap.delete(sessionId);
    }
  }
}
