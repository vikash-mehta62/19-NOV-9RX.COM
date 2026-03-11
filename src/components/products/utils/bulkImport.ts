import { ProductFormValues } from "@/components/products/schemas/productSchema";

export interface ImportIssue {
  row: number;
  message: string;
}

export interface ParsedBulkImport {
  format: "json" | "csv";
  sourceRowCount: number;
  products: ProductFormValues[];
  issues: ImportIssue[];
  columns: string[];
}

type RawRow = Record<string, unknown>;

const DEFAULT_DESCRIPTION_SUFFIX = "Imported product from bulk upload";

const HEADER_ALIASES = {
  name: ["name", "product", "product_name", "title", "item_name", "description_1"],
  description: ["description", "details", "long_description", "product_description"],
  category: ["category", "department", "group"],
  subcategory: ["subcategory", "sub_category", "sub category", "subgroup"],
  sku: ["sku", "item_number", "item_no", "item", "product_code"],
  keyFeatures: ["key_features", "features", "feature"],
  sequence: ["squanence", "sequence", "sort_order", "display_order"],
  ndcCode: ["ndccode", "ndc", "ndc_code"],
  upcCode: ["upccode", "upc", "upc_code", "barcode"],
  lotNumber: ["lotnumber", "lot_number", "lot"],
  expiry: ["expiry", "exipry", "expiration", "expiry_date", "expiration_date"],
  imageUrl: ["image_url", "image", "imageurl", "primary_image"],
  images: ["images", "image_urls", "gallery"],
  basePrice: ["base_price", "price", "rate_cs", "rate", "unit_price", "cost"],
  stock: ["current_stock", "stock", "qty_case", "quantity", "inventory"],
  minStock: ["min_stock", "minimum_stock"],
  reorderPoint: ["reorder_point", "reorder", "reorder_level"],
  quantityPerCase: ["quantity_per_case", "qty_per_case", "qty_case", "case_qty"],
  sizeValue: ["size_value", "size", "product_size", "pack_size"],
  sizeUnit: ["size_unit", "unit", "uom"],
  sizeSku: ["size_sku", "variant_sku"],
  sizePrice: ["size_price", "variant_price", "unit_price", "price", "rate_cs"],
  pricePerCase: ["price_per_case", "case_price", "rate_cs"],
  shippingCost: ["shipping_cost", "freight", "shipping"],
  rollsPerCase: ["rolls_per_case", "rolls"],
} as const;

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

const normalizeCategory = (value?: string) => {
  const cleaned = (value || "").trim();
  return cleaned ? cleaned.toUpperCase() : "OTHER";
};

const toStringValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const toNumberValue = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return fallback;

  const cleaned = value.replace(/[$,%\s]/g, "").trim();
  if (!cleaned) return fallback;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBooleanValue = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  const normalized = toStringValue(value).toLowerCase();
  if (!normalized) return fallback;
  return ["true", "yes", "1", "y"].includes(normalized);
};

const getField = (row: RawRow, aliases: readonly string[]) => {
  for (const alias of aliases) {
    const direct = row[alias];
    if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
      return direct;
    }

    const normalizedAlias = normalizeHeader(alias);
    for (const key of Object.keys(row)) {
      if (normalizeHeader(key) === normalizedAlias) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return value;
        }
      }
    }
  }

  return undefined;
};

const splitImageList = (value: unknown) =>
  toStringValue(value)
    .split(/[,\n|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const parseCsv = (text: string): RawRow[] => {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.trim());

  return dataRows.map((values) => {
    const entry: RawRow = {};
    headers.forEach((header, index) => {
      entry[header] = values[index] ?? "";
    });
    return entry;
  });
};

const parseJson = (text: string): RawRow[] => {
  const parsed = JSON.parse(text);

  if (Array.isArray(parsed)) {
    return parsed.filter((entry) => typeof entry === "object" && entry !== null) as RawRow[];
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { products?: unknown[] }).products)) {
    return ((parsed as { products: unknown[] }).products).filter(
      (entry) => typeof entry === "object" && entry !== null
    ) as RawRow[];
  }

  throw new Error("Upload must be a JSON array or an object with a products array.");
};

const createFallbackSize = (
  row: RawRow,
  basePrice: number,
  stock: number,
  quantityPerCase: number
) => ({
  size_value: toStringValue(getField(row, HEADER_ALIASES.sizeValue)) || "1",
  size_unit: toStringValue(getField(row, HEADER_ALIASES.sizeUnit)) || "unit",
  sku: toStringValue(getField(row, HEADER_ALIASES.sizeSku)) || toStringValue(getField(row, HEADER_ALIASES.sku)),
  image: "",
  price: toNumberValue(getField(row, HEADER_ALIASES.sizePrice), basePrice),
  price_per_case: toNumberValue(getField(row, HEADER_ALIASES.pricePerCase), basePrice),
  stock,
  groupIds: [],
  disAllogroupIds: [],
  ndcCode: toStringValue(getField(row, HEADER_ALIASES.ndcCode)),
  upcCode: toStringValue(getField(row, HEADER_ALIASES.upcCode)),
  lotNumber: toStringValue(getField(row, HEADER_ALIASES.lotNumber)),
  exipry: toStringValue(getField(row, HEADER_ALIASES.expiry)),
  unitToggle: toBooleanValue(getField(row, ["unittoggle", "unit_toggle"]), false),
  unit: true,
  case: true,
  rolls_per_case: Math.max(0, toNumberValue(getField(row, HEADER_ALIASES.rollsPerCase), 0)),
  sizeSquanence: 0,
  shipping_cost: Math.max(0, toNumberValue(getField(row, HEADER_ALIASES.shippingCost), 15)),
  quantity_per_case: Math.max(1, quantityPerCase),
});

const mapRowsToProducts = (rows: RawRow[]): Omit<ParsedBulkImport, "format" | "sourceRowCount"> => {
  const issues: ImportIssue[] = [];
  const productMap = new Map<string, ProductFormValues>();
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  rows.forEach((row, rowIndex) => {
    const name = toStringValue(getField(row, HEADER_ALIASES.name));
    const category = normalizeCategory(toStringValue(getField(row, HEADER_ALIASES.category)));
    const subcategory = toStringValue(getField(row, HEADER_ALIASES.subcategory));
    const sku = toStringValue(getField(row, HEADER_ALIASES.sku));

    if (!name) {
      issues.push({
        row: rowIndex + 2,
        message: "Missing product name.",
      });
      return;
    }

    const description =
      toStringValue(getField(row, HEADER_ALIASES.description)) ||
      `${name} ${DEFAULT_DESCRIPTION_SUFFIX}`;

    const basePrice = Math.max(0.01, toNumberValue(getField(row, HEADER_ALIASES.basePrice), 0.01));
    const stock = Math.max(0, toNumberValue(getField(row, HEADER_ALIASES.stock), 0));
    const quantityPerCase = Math.max(1, toNumberValue(getField(row, HEADER_ALIASES.quantityPerCase), 1));

    const productKey = sku || `${name.toLowerCase()}__${category.toLowerCase()}__${subcategory.toLowerCase()}`;
    const existing = productMap.get(productKey);

    const size = createFallbackSize(row, basePrice, stock, quantityPerCase);

    if (existing) {
      existing.sizes.push({
        ...size,
        sizeSquanence: existing.sizes.length,
      });
      existing.base_price = Math.min(existing.base_price, size.price);
      existing.current_stock += size.stock;
      return;
    }

    const images = [
      ...splitImageList(getField(row, HEADER_ALIASES.images)),
      ...splitImageList(getField(row, HEADER_ALIASES.imageUrl)),
    ];

    productMap.set(productKey, {
      name,
      description: description.length >= 10 ? description : `${description} product`,
      sku,
      key_features: toStringValue(getField(row, HEADER_ALIASES.keyFeatures)),
      squanence: toStringValue(getField(row, HEADER_ALIASES.sequence)),
      ndcCode: toStringValue(getField(row, HEADER_ALIASES.ndcCode)),
      upcCode: toStringValue(getField(row, HEADER_ALIASES.upcCode)),
      lotNumber: toStringValue(getField(row, HEADER_ALIASES.lotNumber)),
      exipry: toStringValue(getField(row, HEADER_ALIASES.expiry)),
      unitToggle: toBooleanValue(getField(row, ["unittoggle", "unit_toggle"]), false),
      category,
      subcategory,
      images,
      sizes: [{ ...size, sizeSquanence: 0 }],
      base_price: size.price,
      current_stock: stock,
      min_stock: Math.max(0, toNumberValue(getField(row, HEADER_ALIASES.minStock), 0)),
      reorder_point: Math.max(0, toNumberValue(getField(row, HEADER_ALIASES.reorderPoint), 0)),
      quantityPerCase: quantityPerCase,
      customization: {
        allowed: false,
        options: [],
        price: 0,
      },
      trackInventory: true,
      image_url: images[0] || "",
      shipping_cost: Math.max(0, toNumberValue(getField(row, HEADER_ALIASES.shippingCost), 15)),
      similar_products: [],
    });
  });

  return {
    products: Array.from(productMap.values()),
    issues,
    columns,
  };
};

export const parseBulkImportFile = async (file: File): Promise<ParsedBulkImport> => {
  const text = await file.text();
  const extension = file.name.split(".").pop()?.toLowerCase();

  let rows: RawRow[];
  let format: "json" | "csv";

  if (extension === "json") {
    rows = parseJson(text);
    format = "json";
  } else if (extension === "csv") {
    rows = parseCsv(text);
    format = "csv";
  } else {
    throw new Error("Only .json and .csv files are supported.");
  }

  const mapped = mapRowsToProducts(rows);

  if (mapped.products.length === 0) {
    throw new Error("No valid products were found in the uploaded file.");
  }

  return {
    format,
    sourceRowCount: rows.length,
    ...mapped,
  };
};

export const buildSampleImportCsv = () => {
  const headers = [
    "PRODUCT",
    "CATEGORY",
    "SUBCATEGORY",
    "SKU",
    "SIZE",
    "UNIT",
    "RATE_CS",
    "QTY_CASE",
    "CURRENT_STOCK",
    "DESCRIPTION",
  ];

  const rows = [
    [
      "Amber Vial 13 Dram",
      "CONTAINERS & CLOSURES",
      "Vials",
      "AV-13D",
      "13",
      "dram",
      "28.5",
      "12",
      "120",
      "Amber vial for prescription packaging",
    ],
    [
      "Amber Vial 20 Dram",
      "CONTAINERS & CLOSURES",
      "Vials",
      "AV-20D",
      "20",
      "dram",
      "31.25",
      "12",
      "96",
      "Amber vial for prescription packaging",
    ],
  ];

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
};
