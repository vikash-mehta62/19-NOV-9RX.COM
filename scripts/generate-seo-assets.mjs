import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const ROOT = process.cwd();
const CLIENT_PATH = path.join(ROOT, "src", "integrations", "supabase", "client.ts");
const PUBLIC_DIR = path.join(ROOT, "public");
dotenv.config({ path: path.join(ROOT, ".env") });

const STATIC_ROUTES = [
  "/",
  "/products",
  "/blog",
  "/about-us",
  "/contact",
  "/newsletter",
  "/privacy-policy",
  "/terms-of-service",
  "/shipping-info",
  "/return-policy",
];

const BLOCKED_ROUTES = [
  "/admin/",
  "/pharmacy/",
  "/group/",
  "/hospital/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/reset-password-page",
  "/accept-terms",
  "/activation",
  "/update-profile",
  "/launch-password-reset",
  "/pay-now",
  "/cart-price",
  "/join-group",
];

const PRODUCT_ID_TOKEN_LENGTH = 8;

function generateSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function shortenSlug(slug, maxWords = 4, maxLength = 40) {
  const words = slug.split("-").filter(Boolean).slice(0, maxWords);
  return words.join("-").slice(0, maxLength).replace(/-+$/g, "");
}

function getProductIdToken(productId) {
  return String(productId || "").slice(0, PRODUCT_ID_TOKEN_LENGTH).toLowerCase();
}

function generateProductSlug(productName, productId) {
  const shortName = shortenSlug(generateSlug(productName));
  return `${shortName || "product"}-${getProductIdToken(productId)}`;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function loadSupabaseConfig() {
  const envUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const envAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (envUrl && (envServiceKey || envAnonKey)) {
    return {
      url: envUrl,
      anonKey: envAnonKey || "",
      serviceKey: envServiceKey || null,
    };
  }

  const clientSource = await fs.readFile(CLIENT_PATH, "utf8");
  const urlMatch = clientSource.match(/SUPABASE_URL\s*=\s*"([^"]+)"/);
  const keyMatch = clientSource.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/);

  if (!urlMatch || !keyMatch) {
    throw new Error("Unable to extract Supabase config for SEO asset generation.");
  }

  return {
    url: urlMatch[1],
    anonKey: keyMatch[1],
    serviceKey: null,
  };
}

async function buildSitemapEntries(baseSiteUrl) {
  const routes = new Map();
  const now = new Date().toISOString();

  for (const route of STATIC_ROUTES) {
    routes.set(route, now);
  }

  try {
    const { url, anonKey, serviceKey } = await loadSupabaseConfig();
    const supabase = createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [products, categories, blogs] = await Promise.all([
      supabase.from("products").select("id,name,updated_at"),
      supabase.from("category_configs").select("category_name"),
      supabase.from("blogs").select("slug,updated_at").eq("is_published", true),
    ]);

    if (products.error) {
      console.warn("[seo] Skipping dynamic product URLs:", products.error.message);
    } else {
      for (const product of products.data || []) {
        if (!product?.id || !product?.name) {
          continue;
        }
        routes.set(`/products/${generateProductSlug(product.name, product.id)}`, product.updated_at || now);
      }
    }

    if (categories.error) {
      console.warn("[seo] Skipping dynamic category URLs:", categories.error.message);
    } else {
      for (const category of categories.data || []) {
        if (!category?.category_name) {
          continue;
        }
        routes.set(`/categories/${generateSlug(category.category_name)}`, now);
      }
    }

    if (blogs.error) {
      console.warn("[seo] Skipping dynamic blog URLs:", blogs.error.message);
    } else {
      for (const blog of blogs.data || []) {
        if (!blog?.slug) {
          continue;
        }
        routes.set(`/blog/${blog.slug}`, blog.updated_at || now);
      }
    }
  } catch (error) {
    console.warn("[seo] Falling back to static sitemap entries:", error.message);
  }

  const urls = [...routes.entries()]
    .map(([route, lastmod]) => {
      const loc = `${baseSiteUrl}${route === "/" ? "/" : route}`;
      return [
        "  <url>",
        `    <loc>${xmlEscape(loc)}</loc>`,
        `    <lastmod>${xmlEscape(lastmod)}</lastmod>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildRobotsTxt(baseSiteUrl) {
  const lines = ["User-agent: *"];
  for (const route of BLOCKED_ROUTES) {
    lines.push(`Disallow: ${route}`);
  }
  lines.push("Allow: /");
  lines.push(`Sitemap: ${baseSiteUrl}/sitemap.xml`);
  lines.push("");
  return lines.join("\n");
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  const siteUrl = (process.env.VITE_SITE_URL || "https://9rx.com").replace(/\/+$/, "");
  const [robotsTxt, sitemapXml] = await Promise.all([
    Promise.resolve(buildRobotsTxt(siteUrl)),
    buildSitemapEntries(siteUrl),
  ]);

  await Promise.all([
    fs.writeFile(path.join(PUBLIC_DIR, "robots.txt"), robotsTxt, "utf8"),
    fs.writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), sitemapXml, "utf8"),
  ]);

  console.log("[seo] Generated robots.txt and sitemap.xml");
}

main().catch((error) => {
  console.error("[seo] Failed to generate SEO assets:", error);
  process.exitCode = 1;
});
