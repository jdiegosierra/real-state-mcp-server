import { Prisma } from "@prisma/client";
import { prisma } from "../db/client.js";
import {
  STATUS_MAP,
  type SearchPropertiesInput,
  type SearchPropertiesOutput,
  type GetPropertyDetailsInput,
  type GetPropertyDetailsOutput,
} from "../schemas/property.schemas.js";

// --- search_properties ---

export async function searchProperties(
  input: SearchPropertiesInput,
): Promise<SearchPropertiesOutput> {
  const where: Prisma.PropertyWhereInput = {};

  if (input.city) {
    where.city = { equals: input.city, mode: "insensitive" };
  }
  if (input.status) {
    where.status = STATUS_MAP[input.status];
  } else {
    where.status = "AVAILABLE";
  }
  if (input.min_price !== undefined || input.max_price !== undefined) {
    where.price = {};
    if (input.min_price !== undefined) where.price.gte = input.min_price;
    if (input.max_price !== undefined) where.price.lte = input.max_price;
  }

  const [total, rows] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        city: true,
        state: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        squareFeet: true,
        propertyType: true,
        status: true,
      },
    }),
  ]);

  return {
    total,
    properties: rows.map((r) => ({
      id: r.id,
      title: r.title,
      city: r.city,
      state: r.state,
      price: Number(r.price),
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      square_feet: r.squareFeet,
      property_type: r.propertyType,
      status: r.status.toLowerCase(),
    })),
  };
}

// --- get_property_details ---

export async function getPropertyDetails(
  input: GetPropertyDetailsInput,
): Promise<GetPropertyDetailsOutput | null> {
  const r = await prisma.property.findUnique({
    where: { id: input.property_id },
  });

  if (!r) return null;

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    address: r.address,
    city: r.city,
    state: r.state,
    zip_code: r.zipCode,
    country: r.country,
    price: Number(r.price),
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    square_feet: r.squareFeet,
    property_type: r.propertyType,
    status: r.status.toLowerCase(),
    year_built: r.yearBuilt,
    lot_size: r.lotSize ? Number(r.lotSize) : null,
    features: r.features,
    internal_notes: r.internalNotes,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}
