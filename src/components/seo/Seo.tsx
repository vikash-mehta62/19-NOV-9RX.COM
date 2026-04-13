import { Helmet } from "react-helmet-async";

const DEFAULT_SITE_NAME = "9RX";
const DEFAULT_SITE_URL = "https://9rx.com";
const DEFAULT_IMAGE = "/logo.png";

type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

interface SeoProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  canonicalUrl?: string;
  image?: string;
  keywords?: string[];
  robots?: string;
  type?: string;
  jsonLd?: JsonLdValue | JsonLdValue[];
}

function getSiteUrl(): string {
  const envBaseUrl = import.meta.env.VITE_APP_BASE_URL || import.meta.env.VITE_API_BASE_URL;
  const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "";
  return (envBaseUrl || runtimeOrigin || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

function toAbsoluteUrl(pathOrUrl?: string): string {
  const siteUrl = getSiteUrl();

  if (!pathOrUrl) {
    return `${siteUrl}/`;
  }

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${siteUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function normalizeJsonLd(jsonLd?: JsonLdValue | JsonLdValue[]): Record<string, unknown>[] {
  if (!jsonLd) {
    return [];
  }

  if (Array.isArray(jsonLd)) {
    return jsonLd.flatMap((entry) => Array.isArray(entry) ? entry : [entry]);
  }

  return [jsonLd];
}

export function Seo({
  title,
  description,
  canonicalPath,
  canonicalUrl,
  image,
  keywords,
  robots,
  type = "website",
  jsonLd,
}: SeoProps) {
  const resolvedCanonical = canonicalUrl || toAbsoluteUrl(canonicalPath);
  const resolvedImage = toAbsoluteUrl(image || DEFAULT_IMAGE);
  const resolvedJsonLd = normalizeJsonLd(jsonLd);

  return (
    <Helmet prioritizeSeoTags>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      {keywords?.length ? <meta name="keywords" content={keywords.join(", ")} /> : null}
      {robots ? <meta name="robots" content={robots} /> : null}
      <meta property="og:site_name" content={DEFAULT_SITE_NAME} />
      <meta property="og:type" content={type} />
      {title ? <meta property="og:title" content={title} /> : null}
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:url" content={resolvedCanonical} />
      <meta property="og:image" content={resolvedImage} />
      <meta name="twitter:card" content="summary_large_image" />
      {title ? <meta name="twitter:title" content={title} /> : null}
      {description ? <meta name="twitter:description" content={description} /> : null}
      <meta name="twitter:image" content={resolvedImage} />
      <link rel="canonical" href={resolvedCanonical} />
      {resolvedJsonLd.map((entry, index) => (
        <script
          key={`json-ld-${index}`}
          type="application/ld+json"
        >
          {JSON.stringify(entry)}
        </script>
      ))}
    </Helmet>
  );
}

export function buildAbsoluteUrl(pathOrUrl?: string): string {
  return toAbsoluteUrl(pathOrUrl);
}
