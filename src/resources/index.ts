import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTodayListingsResource } from "./today-listings.js";

export function registerAllResources(server: McpServer): void {
  registerTodayListingsResource(server);
}
