import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    property: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("../src/db/client.js");
const { getPropertyDetails } = await import("../src/services/property.service.js");

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
  lotSize: Object.assign(Object.create({ toString: () => "0.25" }), { valueOf: () => 0.25 }) as never,
  features: ["Pool", "Garage"],
  internalNotes: "Owner motivated",
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-02T00:00:00Z"),
};

describe("get_property_details", () => {
  it("returns full property details with correct mapping", async () => {
    mockedFindUnique.mockResolvedValue(fakeRow as never);

    const result = await getPropertyDetails({
      property_id: "00000000-0000-0000-0000-000000000001",
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe(fakeRow.id);
    expect(result!.title).toBe("Test Property");
    expect(result!.zip_code).toBe("73301");
    expect(result!.price).toBe(500000);
    expect(result!.features).toEqual(["Pool", "Garage"]);
    expect(result!.internal_notes).toBe("Owner motivated");
    expect(result!.status).toBe("available");
    expect(result!.lot_size).toBe(0.25);
    expect(result!.created_at).toBe("2025-01-01T00:00:00.000Z");
  });

  it("returns null when property not found", async () => {
    mockedFindUnique.mockResolvedValue(null);

    const result = await getPropertyDetails({
      property_id: "00000000-0000-0000-0000-999999999999",
    });

    expect(result).toBeNull();
  });

  it("handles null optional fields", async () => {
    mockedFindUnique.mockResolvedValue({
      ...fakeRow,
      description: null,
      bedrooms: null,
      bathrooms: null,
      squareFeet: null,
      yearBuilt: null,
      lotSize: null,
      internalNotes: null,
      features: [],
    } as never);

    const result = await getPropertyDetails({
      property_id: "00000000-0000-0000-0000-000000000001",
    });

    expect(result!.description).toBeNull();
    expect(result!.bedrooms).toBeNull();
    expect(result!.bathrooms).toBeNull();
    expect(result!.square_feet).toBeNull();
    expect(result!.year_built).toBeNull();
    expect(result!.lot_size).toBeNull();
    expect(result!.internal_notes).toBeNull();
    expect(result!.features).toEqual([]);
  });
});
