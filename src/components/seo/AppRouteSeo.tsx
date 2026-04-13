import { useLocation } from "react-router-dom";
import { Seo } from "@/components/seo/Seo";

const STATIC_PUBLIC_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "9RX - Trusted Pharmacy Supplies",
    description:
      "9RX provides premium pharmacy supplies including RX vials, prescription labels, and packaging solutions trusted by pharmacies nationwide.",
  },
  "/products": {
    title: "Pharmacy Supplies Catalog | 9RX",
    description:
      "Browse 9RX pharmacy supplies including vials, labels, packaging, and wholesale-ready essentials for independent pharmacies.",
  },
  "/blog": {
    title: "Blog - 9RX | Pharmacy Industry Insights & Tips",
    description:
      "Read pharmacy industry insights, product guidance, and operational tips from 9RX.",
  },
  "/about-us": {
    title: "About Us - 9RX | Premium Pharmacy Supplies",
    description:
      "Learn about 9RX, our mission, and how we support independent pharmacies with dependable supply solutions.",
  },
  "/contact": {
    title: "Contact Us - 9RX | Get in Touch",
    description:
      "Contact 9RX for product questions, wholesale pharmacy supply support, and partnership inquiries.",
  },
  "/newsletter": {
    title: "Newsletter - 9RX | Subscribe for Exclusive Deals",
    description:
      "Subscribe to the 9RX newsletter for pharmacy supply updates, promotions, and product announcements.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | 9RX",
    description:
      "Review the 9RX privacy policy for details on how we collect, use, and protect customer information.",
  },
  "/terms-of-service": {
    title: "Terms of Service | 9RX",
    description:
      "Read the 9RX terms of service covering account use, orders, and platform access.",
  },
  "/shipping-info": {
    title: "Shipping Information | 9RX",
    description:
      "Find shipping timelines, options, and logistics details for 9RX pharmacy supply orders.",
  },
  "/return-policy": {
    title: "Return Policy | 9RX",
    description:
      "Understand the 9RX return policy, eligibility windows, and refund expectations.",
  },
  "/sitemap": {
    title: "Sitemap - 9RX | Navigate Our Website",
    description:
      "Browse the 9RX website structure and discover public pages, resources, and support content.",
  },
};

const NOINDEX_PREFIXES = ["/admin", "/pharmacy", "/group", "/hospital"];
const NOINDEX_EXACT_PATHS = new Set([
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
]);

export function AppRouteSeo() {
  const location = useLocation();
  const { pathname } = location;

  const isPrivateRoute = NOINDEX_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isNoindexRoute = isPrivateRoute || NOINDEX_EXACT_PATHS.has(pathname);
  const isLegacyProductRoute = pathname === "/product" || pathname.startsWith("/product/");

  if (isNoindexRoute) {
    return (
      <Seo
        title="9RX"
        description="Restricted 9RX portal route."
        canonicalPath={pathname}
        robots="noindex, nofollow"
      />
    );
  }

  if (isLegacyProductRoute) {
    return (
      <Seo
        title="9RX Product"
        description="Redirecting to the canonical 9RX product page."
        canonicalPath={pathname}
        robots="noindex, follow"
      />
    );
  }

  const meta = STATIC_PUBLIC_META[pathname];

  if (!meta) {
    return null;
  }

  return (
    <Seo
      title={meta.title}
      description={meta.description}
      canonicalPath={pathname}
      robots="index, follow"
    />
  );
}
