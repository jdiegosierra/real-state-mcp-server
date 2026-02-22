import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchPropertiesTool } from "./search-properties.js";
import { registerGetPropertyDetailsTool } from "./get-property-details.js";
import { registerGenerateListingContentTool } from "./generate-listing-content.js";

export function registerAllTools(server: McpServer): void {
  registerSearchPropertiesTool(server);
  registerGetPropertyDetailsTool(server);
  registerGenerateListingContentTool(server);
}
