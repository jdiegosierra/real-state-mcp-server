import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    property: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Must import after mock is set up
const { prisma } = await import("../src/db/client.js");
const { searchProperties } = await import("../src/services/property.service.js");

const mockedCount = vi.mocked(prisma.property.count);
const mockedFindMany = vi.mocked(prisma.property.findMany);

beforeEach(() => {
  vi.clearAllMocks();
});

const fakeProperty = {
  id: "00000000-0000-0000-0000-000000000001",
  title: "Test Property",
  city: "Austin",
  state: "TX",
  price: Object.assign(Object.create({ toString: () => "500000" }), { valueOf: () => 500000 }) as never,
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1500,
  propertyType: "HOUSE" as const,
  status: "AVAILABLE" as const,
};

describe("search_properties", () => {
  it("returns matching properties with correct structure", async () => {
    mockedCount.mockResolvedValue(1);
    mockedFindMany.mockResolvedValue([fakeProperty] as never);

    const result = await searchProperties({});

    expect(result.total).toBe(1);
    expect(result.properties).toHaveLength(1);
    expect(result.properties[0]).toEqual({
      id: fakeProperty.id,
      title: "Test Property",
      city: "Austin",
      state: "TX",
      price: 500000,
      bedrooms: 3,
      bathrooms: 2,
      square_feet: 1500,
      property_type: "HOUSE",
      status: "available",
    });
  });

  it("defaults to AVAILABLE status filter", async () => {
    mockedCount.mockResolvedValue(0);
    mockedFindMany.mockResolvedValue([]);

    await searchProperties({});

    const countCall = mockedCount.mock.calls[0][0] as { where: { status: string } };
    expect(countCall.where.status).toBe("AVAILABLE");
  });

  it("filters by city (case-insensitive)", async () => {
    mockedCount.mockResolvedValue(0);
    mockedFindMany.mockResolvedValue([]);

    await searchProperties({ city: "Austin" });

    const countCall = mockedCount.mock.calls[0][0] as {
      where: { city: { equals: string; mode: string } };
    };
    expect(countCall.where.city).toEqual({ equals: "Austin", mode: "insensitive" });
  });

  it("applies min_price and max_price filters", async () => {
    mockedCount.mockResolvedValue(0);
    mockedFindMany.mockResolvedValue([]);

    await searchProperties({ min_price: 100000, max_price: 500000 });

    const countCall = mockedCount.mock.calls[0][0] as {
      where: { price: { gte: number; lte: number } };
    };
    expect(countCall.where.price).toEqual({ gte: 100000, lte: 500000 });
  });

  it("maps 'sold' status to SOLD enum", async () => {
    mockedCount.mockResolvedValue(0);
    mockedFindMany.mockResolvedValue([]);

    await searchProperties({ status: "sold" });

    const countCall = mockedCount.mock.calls[0][0] as { where: { status: string } };
    expect(countCall.where.status).toBe("SOLD");
  });

  it("returns empty array when no results", async () => {
    mockedCount.mockResolvedValue(0);
    mockedFindMany.mockResolvedValue([]);

    const result = await searchProperties({});

    expect(result.total).toBe(0);
    expect(result.properties).toEqual([]);
  });
});
