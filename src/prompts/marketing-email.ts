import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { logger } from "../logger.js";

export function registerMarketingEmailPrompt(server: McpServer): void {
  server.registerPrompt(
    "marketing-email",
    {
      title: "Marketing Email",
      description:
        "Generates a prompt that helps the user write a marketing email about a specific property. Provide a property_id to get a pre-filled prompt with property details.",
      argsSchema: {
        property_id: z.string().uuid().describe("The UUID of the property to write about"),
      },
    },
    async ({ property_id }) => {
      logger.info({ property_id }, "marketing-email prompt requested");

      const property = await prisma.property.findUnique({
        where: { id: property_id },
      });

      if (!property) {
        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Error: Property with id "${property_id}" not found. Please provide a valid property ID.`,
              },
            },
          ],
        };
      }

      const price = Number(property.price).toLocaleString("en-US");
      const features = property.features.length
        ? property.features.join(", ")
        : "No specific features listed";
      const specs = [
        property.bedrooms !== null ? `${property.bedrooms} bedrooms` : null,
        property.bathrooms !== null ? `${property.bathrooms} bathrooms` : null,
        property.squareFeet !== null
          ? `${property.squareFeet.toLocaleString("en-US")} sq ft`
          : null,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        description: `Marketing email prompt for: ${property.title}`,
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Write a compelling marketing email for the following real estate property:`,
                ``,
                `**Property:** ${property.title}`,
                `**Price:** $${price}`,
                `**Location:** ${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,
                `**Type:** ${property.propertyType}`,
                specs ? `**Specs:** ${specs}` : "",
                `**Features:** ${features}`,
                property.description ? `**Description:** ${property.description}` : "",
                ``,
                `The email should:`,
                `- Have an attention-grabbing subject line`,
                `- Highlight the key selling points`,
                `- Include a clear call to action`,
                `- Be professional but engaging`,
                `- Be suitable for sending to potential buyers`,
              ]
                .filter((line) => line !== "")
                .join("\n"),
            },
          },
        ],
      };
    },
  );
}
