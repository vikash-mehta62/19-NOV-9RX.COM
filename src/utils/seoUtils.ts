export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const PRODUCT_ID_TOKEN_LENGTH = 8;

function shortenSlug(slug: string, maxWords = 4, maxLength = 40): string {
  const words = slug.split("-").filter(Boolean).slice(0, maxWords);
  const shortened = words.join("-");
  return shortened.slice(0, maxLength).replace(/-+$/g, "");
}

export function buildAbsoluteUrl(pathOrUrl: string): string {
  const baseUrl = (import.meta.env.VITE_APP_BASE_URL || "https://9rx.com").replace(/\/+$/, "");
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  return `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function extractUuid(value: string): string | null {
  const match = value.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return match ? match[1] : null;
}

export function getProductIdToken(productId: string): string {
  return productId.slice(0, PRODUCT_ID_TOKEN_LENGTH).toLowerCase();
}

export function isProductIdToken(value: string): boolean {
  return /^[0-9a-f]{8,12}$/i.test(value);
}

export function extractProductIdToken(value: string): string | null {
  const uuid = extractUuid(value);
  if (uuid) {
    return getProductIdToken(uuid);
  }

  const match = value.match(/([0-9a-f]{8,12})$/i);
  return match ? match[1].toLowerCase() : null;
}

export function parseProductParam(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  if (isUuid(value)) {
    return value;
  }

  return extractUuid(value) || extractProductIdToken(value) || value;
}

export function generateProductSlug(productName: string, productId: string): string {
  const shortName = shortenSlug(generateSlug(productName));
  return `${shortName || "product"}-${getProductIdToken(productId)}`;
}

export function generateProductUrl(productId: string, productName: string): string {
  return `/products/${generateProductSlug(productName, productId)}`;
}

export function generateLegacyProductUrl(productId: string): string {
  return `/product/${productId}`;
}

export function generateCategoryUrl(categoryName: string): string {
  return `/categories/${shortenSlug(generateSlug(categoryName), 5, 50)}`;
}

export function parseProductUrl(url: string): string | null {
  return parseProductParam(url);
}

export interface ProductMetaInput {
  name: string;
  description?: string;
  image_url?: string;
  sku?: string;
  category?: string;
}

export function generateProductMeta(product: ProductMetaInput) {
  return {
    title: `${product.name} | 9RX Pharmacy Supplies`,
    description: product.description
      ? product.description.slice(0, 160)
      : `Shop ${product.name} at 9RX. Quality pharmacy supplies with wholesale pricing.`,
    keywords: [
      product.name,
      product.category,
      "pharmacy supplies",
      "wholesale",
      "medical supplies",
      product.sku,
    ].filter(Boolean) as string[],
    ogImage: product.image_url,
  };
}

export function generateProductStructuredData(product: {
  name: string;
  description?: string;
  image_url?: string;
  sku?: string;
  category?: string;
  price?: number;
  inStock?: boolean;
  canonicalUrl?: string;
}) {
  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || "",
    image: product.image_url ? [product.image_url] : [],
    sku: product.sku || "",
    category: product.category || "",
    brand: {
      "@type": "Brand",
      name: "9RX",
    },
    url: product.canonicalUrl,
  };

  if (typeof product.price === "number" && Number.isFinite(product.price)) {
    structuredData.offers = {
      "@type": "Offer",
      availability: product.inStock === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      priceCurrency: "USD",
      price: product.price,
    };
  }

  return structuredData;
}

export function generateBreadcrumbStructuredData(
  items: Array<{ name: string; url: string }>
){
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
