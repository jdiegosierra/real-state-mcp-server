import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CHARACTER_LIMIT } from "../constants.js";
import { logger } from "../logger.js";
import {
  SearchPropertiesInputSchema,
  SearchPropertiesOutputSchema,
  type SearchPropertiesInput,
} from "../schemas/property.schemas.js";
import { searchProperties } from "../services/property.service.js";

function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return text.slice(0, CHARACTER_LIMIT) + "\n\n[Response truncated.]";
}

export function registerSearchPropertiesTool(server: McpServer): void {
  server.registerTool(
    "search_properties",
    {
      title: "Search Properties",
      description:
        "Allows the AI to find properties based on filters. Returns a JSON list of matching properties (summary view).",
      inputSchema: SearchPropertiesInputSchema,
      outputSchema: SearchPropertiesOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      logger.info({ input }, "search_properties called");
      const data = await searchProperties(input as SearchPropertiesInput);
      const text = JSON.stringify(data, null, 2);

      return {
        structuredContent: data,
        content: [{ type: "text" as const, text: truncate(text) }],
      };
    },
  );
}
