import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMcpServer } from "./server.js";
import { logger } from "./logger.js";
import { requireAuth } from "./middleware/auth.js";

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  // --- Health check (no auth) ---
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // --- Auth middleware for all MCP endpoints ---
  app.use(["/mcp", "/sse", "/messages"], requireAuth);

  // --- Streamable HTTP (primary, stateless) ---
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });

      res.on("close", () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      logger.error({ err }, "Error handling /mcp request");
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // --- SSE transport ---
  const sseTransports = new Map<string, SSEServerTransport>();

  app.get("/sse", async (req: Request, res: Response) => {
    try {
      const server = createMcpServer();
      const transport = new SSEServerTransport("/messages", res);
      sseTransports.set(transport.sessionId, transport);

      transport.onclose = () => {
        sseTransports.delete(transport.sessionId);
      };

      await server.connect(transport);
      logger.info({ sessionId: transport.sessionId }, "SSE session opened");
    } catch (err) {
      logger.error({ err }, "Error opening SSE session");
      if (!res.headersSent) {
        res.status(500).end();
      }
    }
  });

  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) {
      res.status(400).json({ error: "Missing sessionId query parameter" });
      return;
    }

    const transport = sseTransports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    try {
      await transport.handlePostMessage(req, res, req.body);
    } catch (err) {
      logger.error({ err, sessionId }, "Error handling SSE message");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  return app;
}
