import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { logger } from "../logger.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header) {
    logger.warn({ path: req.path }, "Missing Authorization header");
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized: missing Authorization header" },
      id: null,
    });
    return;
  }

  // Accept "Bearer <key>" or plain "<key>"
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;

  if (token !== config.API_KEY) {
    logger.warn({ path: req.path }, "Invalid API key");
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized: invalid API key" },
      id: null,
    });
    return;
  }

  next();
}
