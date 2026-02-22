import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    property: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("../src/db/client.js");
const { generateListingContent } = await import(
  "../src/services/content-generator.service.js"
);

const mockedFindUnique = vi.mocked(prisma.property.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
});

const fakeRow = {
  id: "00000000-0000-0000-0000-000000000001",
  title: "Test Property",
  description: "A nice place",
  address: "123 Main St",
  city: "Austin",
  state: "TX",
  zipCode: "73301",
  country: "US",
  price: Object.assign(Object.create({ toString: () => "500000" }), { valueOf: () => 500000 }) as never,
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1500,
  propertyType: "HOUSE" as const,
  status: "AVAILABLE" as const,
  yearBuilt: 2020,
  lotSize: null,
  features: ["Pool", "Garage"],
  internalNotes: null,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-02T00:00:00Z"),
};

describe("generate_listing_content", () => {
  it("returns HTML with title, meta, and article tags", async () => {
    mockedFindUnique.mockResolvedValue(fakeRow as never);

    const result = await generateListingContent({
      property_id: "00000000-0000-0000-0000-000000000001",
      target_language: "en",
    });

    expect(result).not.toBeNull();
    expect(result!.property_id).toBe(fakeRow.id);
    expect(result!.language).toBe("en");
    expect(result!.html).toContain("<title>");
    expect(result!.html).toContain('<meta name="description"');
    expect(result!.html).toContain('<meta property="og:title"');
    expect(result!.html).toContain("<article");
    expect(result!.html).toContain("Test Property");
    expect(result!.html).toContain("500,000");
  });

  it("includes features in HTML", async () => {
    mockedFindUnique.mockResolvedValue(fakeRow as never);

    const result = await generateListingContent({
      property_id: "00000000-0000-0000-0000-000000000001",
      target_language: "en",
    });

    expect(result!.html).toContain("<li>Pool</li>");
    expect(result!.html).toContain("<li>Garage</li>");
  });

  it("respects target_language parameter", async () => {
    mockedFindUnique.mockResolvedValue(fakeRow as never);

    const result = await generateListingContent({
      property_id: "00000000-0000-0000-0000-000000000001",
      target_language: "es",
    });

    expect(result!.language).toBe("es");
    expect(result!.html).toContain('content="es"');
  });

  it("applies tone to article tag", async () => {
    mockedFindUnique.mockResolvedValue(fakeRow as never);

    const result = await generateListingContent({
      property_id: "00000000-0000-0000-0000-000000000001",
      target_language: "en",
      tone: "luxury",
    });

    expect(result!.html).toContain('data-tone="luxury"');
  });

  it("returns null when property not found", async () => {
    mockedFindUnique.mockResolvedValue(null);

    const result = await generateListingContent({
      property_id: "00000000-0000-0000-0000-999999999999",
      target_language: "en",
    });

    expect(result).toBeNull();
  });

  it("handles property with no features", async () => {
    mockedFindUnique.mockResolvedValue({
      ...fakeRow,
      features: [],
    } as never);

    const result = await generateListingContent({
      property_id: "00000000-0000-0000-0000-000000000001",
      target_language: "en",
    });

    expect(result!.html).not.toContain("<ul>");
    expect(result!.html).not.toContain("<li>");
  });

  it("escapes HTML in property fields", async () => {
    mockedFindUnique.mockResolvedValue({
      ...fakeRow,
      title: 'Property <script>alert("xss")</script>',
    } as never);

    const result = await generateListingContent({
      property_id: "00000000-0000-0000-0000-000000000001",
      target_language: "en",
    });

    expect(result!.html).not.toContain("<script>");
    expect(result!.html).toContain("&lt;script&gt;");
  });
});
