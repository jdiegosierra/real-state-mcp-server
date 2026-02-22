import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CHARACTER_LIMIT } from "../constants.js";
import { logger } from "../logger.js";
import {
  GetPropertyDetailsInputSchema,
  GetPropertyDetailsOutputSchema,
  type GetPropertyDetailsInput,
} from "../schemas/property.schemas.js";
import { getPropertyDetails } from "../services/property.service.js";

function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return text.slice(0, CHARACTER_LIMIT) + "\n\n[Response truncated.]";
}

export function registerGetPropertyDetailsTool(server: McpServer): void {
  server.registerTool(
    "get_property_details",
    {
      title: "Get Property Details",
      description:
        "Retrieves full technical details for a specific property ID, including features and internal notes. Returns the full JSON object or an error if not found.",
      inputSchema: GetPropertyDetailsInputSchema,
      outputSchema: GetPropertyDetailsOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const parsed = input as GetPropertyDetailsInput;
      logger.info({ property_id: parsed.property_id }, "get_property_details called");

      const data = await getPropertyDetails(parsed);

      if (!data) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "not_found",
                message: `Property with id "${parsed.property_id}" not found.`,
              }),
            },
          ],
        };
      }

      const text = JSON.stringify(data, null, 2);
      return {
        structuredContent: data,
        content: [{ type: "text" as const, text: truncate(text) }],
      };
    },
  );
}
