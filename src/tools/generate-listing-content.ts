import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CHARACTER_LIMIT } from "../constants.js";
import { logger } from "../logger.js";
import {
  GenerateListingContentInputSchema,
  GenerateListingContentOutputSchema,
  type GenerateListingContentInput,
} from "../schemas/property.schemas.js";
import { generateListingContent } from "../services/content-generator.service.js";

function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return text.slice(0, CHARACTER_LIMIT) + "\n\n[Response truncated.]";
}

export function registerGenerateListingContentTool(server: McpServer): void {
  server.registerTool(
    "generate_listing_content",
    {
      title: "Generate Listing Content",
      description:
        "Takes a property ID, generates SEO-optimized HTML content with <title>, <meta>, and structured article markup. Returns the HTML snippet.",
      inputSchema: GenerateListingContentInputSchema,
      outputSchema: GenerateListingContentOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const parsed = input as GenerateListingContentInput;
      logger.info(
        { property_id: parsed.property_id, language: parsed.target_language },
        "generate_listing_content called",
      );

      const data = await generateListingContent(parsed);

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
