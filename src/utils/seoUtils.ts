/**
 * SEO Utilities
 * Functions for generating SEO-friendly URLs and meta tags
 */

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a product URL with SEO-friendly slug
 */
export function generateProductUrl(
  productId: string,
  productName: string,
  isPharmacy: boolean = false
): string {
  const slug = generateSlug(productName);
  const basePath = isPharmacy ? "/pharmacy/product" : "/product";
  return `${basePath}/${slug}-${productId}`;
}

/**
 * Parse a product URL to extract the ID
 */
export function parseProductUrl(url: string): string | null {
  // Match pattern: /product/slug-uuid or /pharmacy/product/slug-uuid
  const match = url.match(
    /\/(?:pharmacy\/)?product\/(?:.*-)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
  );
  return match ? match[1] : null;
}

/**
 * Generate category URL
 */
export function generateCategoryUrl(categoryName: string): string {
  const slug = generateSlug(categoryName);
  return `/pharmacy/categories/${slug}`;
}

/**
 * Generate order URL
 */
export function generateOrderUrl(orderNumber: string): string {
  return `/pharmacy/orders/${orderNumber}`;
}

/**
 * Meta tag generator for product pages
 */
export interface ProductMeta {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl?: string;
}

export function generateProductMeta(product: {
  name: string;
  description?: string;
  category?: string;
  image_url?: string;
  sku?: string;
}): ProductMeta {
  const title = `${product.name} | 9RX Pharmacy Supplies`;
  
  const description = product.description
    ? product.description.slice(0, 160)
    : `Shop ${product.name} at 9RX. Quality pharmacy supplies with wholesale pricing.`;

  const keywords = [
    product.name,
    product.category,
    "pharmacy supplies",
    "wholesale",
    "medical supplies",
    product.sku,
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    ogImage: product.image_url,
  };
}

/**
 * Update document meta tags
 */
export function updateMetaTags(meta: Partial<ProductMeta>): void {
  if (typeof document === "undefined") return;

  // Update title
  if (meta.title) {
    document.title = meta.title;
  }

  // Update or create meta description
  if (meta.description) {
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement("meta");
      descMeta.setAttribute("name", "description");
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute("content", meta.description);
  }

  // Update or create meta keywords
  if (meta.keywords && meta.keywords.length > 0) {
    let keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (!keywordsMeta) {
      keywordsMeta = document.createElement("meta");
      keywordsMeta.setAttribute("name", "keywords");
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.setAttribute("content", meta.keywords.join(", "));
  }

  // Update Open Graph tags
  if (meta.title) {
    updateOgTag("og:title", meta.title);
  }
  if (meta.description) {
    updateOgTag("og:description", meta.description);
  }
  if (meta.ogImage) {
    updateOgTag("og:image", meta.ogImage);
  }
  if (meta.canonicalUrl) {
    updateOgTag("og:url", meta.canonicalUrl);
    
    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", meta.canonicalUrl);
  }
}

function updateOgTag(property: string, content: string): void {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Generate structured data (JSON-LD) for products
 */
export function generateProductStructuredData(product: {
  name: string;
  description?: string;
  image_url?: string;
  sku?: string;
  category?: string;
  price?: number;
  inStock?: boolean;
}): string {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || "",
    image: product.image_url || "",
    sku: product.sku || "",
    category: product.category || "",
    offers: {
      "@type": "Offer",
      availability: product.inStock !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceCurrency: "USD",
      price: product.price || 0,
    },
    brand: {
      "@type": "Brand",
      name: "9RX",
    },
  };

  return JSON.stringify(structuredData);
}

/**
 * Inject structured data into the page
 */
export function injectStructuredData(jsonLd: string): void {
  if (typeof document === "undefined") return;

  // Remove existing product structured data
  const existing = document.querySelector('script[data-type="product-jsonld"]');
  if (existing) {
    existing.remove();
  }

  // Add new structured data
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-type", "product-jsonld");
  script.textContent = jsonLd;
  document.head.appendChild(script);
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbStructuredData(
  items: Array<{ name: string; url: string }>
): string {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return JSON.stringify(structuredData);
}
