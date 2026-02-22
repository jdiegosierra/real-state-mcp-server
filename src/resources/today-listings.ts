import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../db/client.js";
import { logger } from "../logger.js";

export function registerTodayListingsResource(server: McpServer): void {
  server.registerResource(
    "today-listings",
    "realestate://listings/today",
    {
      title: "Today's Listings",
      description:
        "A daily digest of new real estate properties added today. Returns all properties created within the last 24 hours.",
      mimeType: "application/json",
    },
    async (uri) => {
      logger.info("realestate://listings/today resource read");

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const properties = await prisma.property.findMany({
        where: {
          createdAt: { gte: startOfDay },
        },
        orderBy: { createdAt: "desc" },
      });

      const digest = {
        date: startOfDay.toISOString().split("T")[0],
        total: properties.length,
        properties: properties.map((p) => ({
          id: p.id,
          title: p.title,
          city: p.city,
          state: p.state,
          price: Number(p.price),
          property_type: p.propertyType,
          status: p.status.toLowerCase(),
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          square_feet: p.squareFeet,
        })),
      };

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(digest, null, 2),
          },
        ],
      };
    },
  );
}
