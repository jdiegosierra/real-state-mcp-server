import { z } from "zod";

// --- Shared enums ---

export const PropertyTypeEnum = z.enum([
  "HOUSE",
  "APARTMENT",
  "CONDO",
  "TOWNHOUSE",
  "LAND",
  "COMMERCIAL",
]);

export const PropertyStatusEnum = z.enum(["available", "sold"]);

// Maps API-facing lowercase values to Prisma enum values
export const STATUS_MAP = {
  available: "AVAILABLE",
  sold: "SOLD",
} as const;

// --- search_properties ---

export const SearchPropertiesInputSchema = z
  .object({
    city: z.string().describe("Filter by city name (case-insensitive)").optional(),
    min_price: z.number().nonnegative().describe("Minimum price filter").optional(),
    max_price: z.number().positive().describe("Maximum price filter").optional(),
    status: PropertyStatusEnum.describe(
      'Filter by property status: "available" or "sold" (default: "available")',
    ).optional(),
  })
  .strict();

export type SearchPropertiesInput = z.infer<typeof SearchPropertiesInputSchema>;

const PropertySummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  city: z.string(),
  state: z.string(),
  price: z.number(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  square_feet: z.number().nullable(),
  property_type: z.string(),
  status: z.string(),
});

export const SearchPropertiesOutputSchema = z
  .object({
    total: z.number().int(),
    properties: z.array(PropertySummarySchema),
  })
  .strict();

export type SearchPropertiesOutput = z.infer<typeof SearchPropertiesOutputSchema>;

// --- get_property_details ---

export const GetPropertyDetailsInputSchema = z
  .object({
    property_id: z.string().uuid().describe("The UUID of the property to retrieve"),
  })
  .strict();

export type GetPropertyDetailsInput = z.infer<typeof GetPropertyDetailsInputSchema>;

export const PropertyDetailsSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip_code: z.string(),
  country: z.string(),
  price: z.number(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  square_feet: z.number().nullable(),
  property_type: z.string(),
  status: z.string(),
  year_built: z.number().nullable(),
  lot_size: z.number().nullable(),
  features: z.array(z.string()),
  internal_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const GetPropertyDetailsOutputSchema = PropertyDetailsSchema.strict();

export type GetPropertyDetailsOutput = z.infer<typeof GetPropertyDetailsOutputSchema>;

// --- generate_listing_content ---

export const GenerateListingContentInputSchema = z
  .object({
    property_id: z.string().uuid().describe("The UUID of the property"),
    target_language: z
      .string()
      .default("en")
      .describe('Target language code (default: "en")'),
    tone: z
      .string()
      .optional()
      .describe('Writing tone, e.g. "professional", "casual", "luxury"'),
  })
  .strict();

export type GenerateListingContentInput = z.infer<typeof GenerateListingContentInputSchema>;

export const GenerateListingContentOutputSchema = z
  .object({
    property_id: z.string().uuid(),
    language: z.string(),
    html: z.string().describe("SEO-optimized HTML snippet"),
  })
  .strict();

export type GenerateListingContentOutput = z.infer<typeof GenerateListingContentOutputSchema>;
