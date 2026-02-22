import { config } from "./config.js";
import { logger } from "./logger.js";
import { prisma } from "./db/client.js";
import { createApp } from "./transport.js";

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "Real Estate MCP Server listening");
  logger.info(`  Streamable HTTP: POST http://localhost:${config.PORT}/mcp`);
  logger.info(`  SSE:             GET  http://localhost:${config.PORT}/sse`);
  logger.info(`  Health:          GET  http://localhost:${config.PORT}/health`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down...");
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
