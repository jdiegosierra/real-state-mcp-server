import { describe, it, expect } from "vitest";
import {
  SearchPropertiesInputSchema,
  GetPropertyDetailsInputSchema,
  GenerateListingContentInputSchema,
} from "../src/schemas/property.schemas.js";

describe("SearchPropertiesInputSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = SearchPropertiesInputSchema.safeParse({
      city: "Austin",
      min_price: 100000,
      max_price: 500000,
      status: "available",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    const result = SearchPropertiesInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects string in number field (min_price)", () => {
    const result = SearchPropertiesInputSchema.safeParse({
      min_price: "not-a-number",
    });
    expect(result.success).toBe(false);
  });

  it("rejects string in number field (max_price)", () => {
    const result = SearchPropertiesInputSchema.safeParse({
      max_price: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative min_price", () => {
    const result = SearchPropertiesInputSchema.safeParse({
      min_price: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status value", () => {
    const result = SearchPropertiesInputSchema.safeParse({
      status: "pending",
    });
    expect(result.success).toBe(false);
  });

  it("rejects extra unexpected fields (.strict())", () => {
    const result = SearchPropertiesInputSchema.safeParse({
      city: "Austin",
      unknown_field: "value",
    });
    expect(result.success).toBe(false);
  });
});

describe("GetPropertyDetailsInputSchema", () => {
  it("accepts valid UUID", () => {
    const result = GetPropertyDetailsInputSchema.safeParse({
      property_id: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID string", () => {
    const result = GetPropertyDetailsInputSchema.safeParse({
      property_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing property_id", () => {
    const result = GetPropertyDetailsInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects number instead of string", () => {
    const result = GetPropertyDetailsInputSchema.safeParse({
      property_id: 12345,
    });
    expect(result.success).toBe(false);
  });
});

describe("GenerateListingContentInputSchema", () => {
  it("accepts valid input", () => {
    const result = GenerateListingContentInputSchema.safeParse({
      property_id: "00000000-0000-0000-0000-000000000001",
      target_language: "en",
      tone: "luxury",
    });
    expect(result.success).toBe(true);
  });

  it("defaults target_language to 'en'", () => {
    const result = GenerateListingContentInputSchema.safeParse({
      property_id: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.target_language).toBe("en");
    }
  });

  it("rejects invalid property_id", () => {
    const result = GenerateListingContentInputSchema.safeParse({
      property_id: "bad-id",
    });
    expect(result.success).toBe(false);
  });

  it("rejects extra fields (.strict())", () => {
    const result = GenerateListingContentInputSchema.safeParse({
      property_id: "00000000-0000-0000-0000-000000000001",
      extra: "nope",
    });
    expect(result.success).toBe(false);
  });
});
