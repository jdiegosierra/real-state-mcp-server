import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMarketingEmailPrompt } from "./marketing-email.js";

export function registerAllPrompts(server: McpServer): void {
  registerMarketingEmailPrompt(server);
}
