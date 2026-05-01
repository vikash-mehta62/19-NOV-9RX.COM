const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const { inventoryStockAlertTemplate } = require("../templates/inventoryStockAlert");
const mailSender = require("../utils/mailSender");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const args = new Set(process.argv.slice(2));
const shouldSend = args.has("--send");
const useSampleIfEmpty = args.has("--sample-if-empty");
const outOnly = args.has("--out-only");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) || 500 : 500;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();

const parseSizeLabel = (size) => {
  const parts = [
    size.size_name,
    size.size_value,
    size.products?.unitToggle === true ? size.size_unit : "",
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.join(" ") || "Default";
};

const classifyStock = (stockValue) => {
  const stock = Number(stockValue || 0);

  if (stock <= 0) {
    return { status: "out_of_stock", threshold: 0 };
  }

  if (stock < 20) {
    return { status: "very_low", threshold: 20 };
  }

  if (stock <= 50) {
    return { status: "critical", threshold: 50 };
  }

  return null;
};

const statusRank = {
  out_of_stock: 0,
  critical: 1,
  very_low: 2,
};

async function fetchAffectedSizes() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in server/.env");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("product_sizes")
    .select(`
      id,
      product_id,
      size_name,
      size_value,
      size_unit,
      sku,
      stock,
      is_active,
      products!inner (
        id,
        name,
        sku,
        min_stock,
        reorder_point,
        unitToggle,
        is_active
      )
    `)
    .order("stock", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((size) => size.is_active !== false && size.products?.is_active !== false)
    .map((size) => {
      const alert = classifyStock(size.stock);
      if (!alert) return null;

      return {
        product_id: size.product_id,
        product_size_id: size.id,
        product_name: size.products?.name || "Unknown product",
        size_label: parseSizeLabel(size),
        size_name: size.size_name || "",
        size_value: size.size_value || "",
        size_unit: size.size_unit || "",
        unitToggle: size.products?.unitToggle === true,
        sku: size.sku || size.products?.sku || "N/A",
        previous_stock: null,
        current_stock: Number(size.stock || 0),
        threshold: alert.threshold,
        status: alert.status,
        source: "test_inventory_stock_alert_script",
      };
    })
    .filter(Boolean)
    .filter((item) => !outOnly || item.status === "out_of_stock")
    .sort((a, b) => {
      const rankDiff = statusRank[a.status] - statusRank[b.status];
      if (rankDiff !== 0) return rankDiff;
      return Number(a.current_stock || 0) - Number(b.current_stock || 0);
    });
}

function getSampleItems() {
  return [
    {
      product_name: "Sample Out-of-Stock Product",
      size_label: "Case 24 ct",
      sku: "TEST-OOS",
      previous_stock: 3,
      current_stock: 0,
      threshold: 0,
      status: "out_of_stock",
    },
    {
      product_name: "Sample Critical Product",
      size_label: "Box 100 ct",
      sku: "TEST-CRIT",
      previous_stock: 62,
      current_stock: 35,
      threshold: 50,
      status: "critical",
    },
    {
      product_name: "Sample Very Low Product",
      size_label: "Each",
      sku: "TEST-LOW",
      previous_stock: 25,
      current_stock: 12,
      threshold: 20,
      status: "very_low",
    },
  ];
}

async function main() {
  const liveItems = await fetchAffectedSizes();
  const items = liveItems.length > 0 ? liveItems : useSampleIfEmpty ? getSampleItems() : [];

  if (items.length === 0) {
    console.log("No low-stock or out-of-stock product sizes found.");
    console.log("Use --sample-if-empty to render a sample preview anyway.");
    return;
  }

  const html = inventoryStockAlertTemplate({
    items,
    generatedAt: new Date(),
  });

  const outDir = path.join(__dirname, "..", ".tmp");
  fs.mkdirSync(outDir, { recursive: true });

  const previewPath = path.join(outDir, "inventory-stock-alert-preview.html");
  fs.writeFileSync(previewPath, html, "utf8");

  const counts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  console.log("Inventory stock alert preview created:");
  console.log(previewPath);
  console.log("Affected product sizes:", items.length);
  console.log("Out of stock:", counts.out_of_stock || 0);
  console.log("Critical:", counts.critical || 0);
  console.log("Very low:", counts.very_low || 0);
  console.log("Source:", liveItems.length > 0 ? "live product_sizes.stock" : "sample data");

  if (!shouldSend) {
    console.log("Dry run only. Add --send to email ADMIN_EMAIL.");
    return;
  }

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is required in server/.env to send the test email");
  }

  const subject = `9RX Inventory Alert Test: ${items.length} affected product size${items.length === 1 ? "" : "s"}`;
  const result = await mailSender(adminEmail, subject, html);

  if (!result.success) {
    throw new Error(result.error || "Failed to send inventory alert test email");
  }

  console.log(`Test email sent to ADMIN_EMAIL: ${adminEmail}`);
  console.log(`Provider message id: ${result.messageId || "N/A"}`);
}

main().catch((error) => {
  console.error("Inventory alert test failed:", error.message);
  process.exit(1);
});
