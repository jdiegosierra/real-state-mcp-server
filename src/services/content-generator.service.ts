import { prisma } from "../db/client.js";
import type {
  GenerateListingContentInput,
  GenerateListingContentOutput,
} from "../schemas/property.schemas.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generateListingContent(
  input: GenerateListingContentInput,
): Promise<GenerateListingContentOutput | null> {
  const property = await prisma.property.findUnique({
    where: { id: input.property_id },
  });

  if (!property) return null;

  const lang = input.target_language ?? "en";
  const tone = input.tone ?? "professional";
  const price = Number(property.price).toLocaleString("en-US");
  const title = escapeHtml(property.title);
  const desc = escapeHtml(
    property.description ?? `${property.propertyType} in ${property.city}, ${property.state}`,
  );

  const featuresHtml = property.features.length
    ? `<ul>${property.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
    : "";

  const bedroomsText = property.bedrooms !== null ? `${property.bedrooms} bed` : "";
  const bathroomsText = property.bathrooms !== null ? `${property.bathrooms} bath` : "";
  const sqftText =
    property.squareFeet !== null
      ? `${property.squareFeet.toLocaleString("en-US")} sq ft`
      : "";
  const specs = [bedroomsText, bathroomsText, sqftText].filter(Boolean).join(" | ");

  // Mocked SEO HTML generation (architecture is real, LLM call is stubbed)
  const html = [
    `<title>${title} | $${price} | ${property.city}, ${property.state}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="language" content="${lang}" />`,
    `<article data-tone="${tone}">`,
    `  <h1>${title}</h1>`,
    `  <p class="price">$${price}</p>`,
    specs ? `  <p class="specs">${specs}</p>` : "",
    `  <p class="location">${escapeHtml(property.address)}, ${escapeHtml(property.city)}, ${escapeHtml(property.state)} ${escapeHtml(property.zipCode)}</p>`,
    `  <div class="description">${desc}</div>`,
    featuresHtml ? `  <div class="features"><h2>Features</h2>${featuresHtml}</div>` : "",
    `</article>`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    property_id: property.id,
    language: lang,
    html,
  };
}
