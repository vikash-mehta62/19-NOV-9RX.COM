import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InventoryItem } from "@/hooks/use-inventory-tracking"; // Assuming this path is correct
import { Badge } from "@/components/ui/badge"; // Although Badge is imported, it's not used in the provided JSX.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client"; // Assuming this path is correct
import { ChevronDown, ChevronUp, Download } from "lucide-react"; // Added Download icon
import React from "react";
interface InventoryReportsProps {
  inventoryData: InventoryItem[];
}

export const InventoryReports = ({ inventoryData }: InventoryReportsProps) => {
  const [products, setProducts] = useState<any[]>([]); // Using any[] for now, consider a more specific type for products
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data: productsData, error } = await supabase
          .from("products")
          .select("*, product_sizes(*)");

        if (error) {
          throw error;
        }
        console.log(productsData);

        const mappedProducts = productsData.map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          customization: {
            allowed: item.customization?.allowed || false,
            options: item.customization?.options || [],
            basePrice: item.customization?.price || 0,
          },
          sizes: item.product_sizes?.map((size: any) => ({
            size_value: size.size_value,
            size_unit: size.size_unit,
            price: size.price,
            sku: size.sku || "",
            quantity_per_case: size.quantity_per_case,
            stock: size.stock,
          })),
        }));

        setProducts(mappedProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  /**
   * Exports all product inventory data to a CSV file.
   * Includes product name, SKU, and details for each size variation.
   */
  const exportAllProductsToCsv = () => {
    const headers = [
      "Product Name",
      "Product Code",
      "Size Value",
      "Size Unit",
      "Price",
      "Stock",
      "Quantity Per Case",
    ];
    let csvContent = headers.join(",") + "\n";

    products.forEach((product) => {
      if (product.sizes && product.sizes.length > 0) {
        product.sizes.forEach((size: any) => {
          csvContent += [
            `"${product.name}"`, // Enclose name in quotes to handle commas
            `"${product.sku}"`,
            `"${size.size_value}"`,
            `"${size.size_unit}"`,
            `"${size.price}"`,
            `"${size.stock}"`,
            `"${size.quantity_per_case}"`,
          ].join(",") + "\n";
        });
      } else {
        // Handle products without sizes, still include main product info
        csvContent += [
          `"${product.name}"`,
          `"${product.sku}"`,
          "", // No size value
          "", // No size unit
          "", // No price
          "", // No stock
          "", // No quantity per case
        ].join(",") + "\n";
      }
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "all_products_inventory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Exports the size-specific inventory data for a single product to a CSV file.
   * @param product The product object to export.
   */
  const exportSingleProductToCsv = (product: any) => {
    const headers = [
      "Size Value",
      "Size Unit",
      "Price",
      "Stock",
      "Quantity Per Case",
    ];
    let csvContent = headers.join(",") + "\n";

    if (product.sizes && product.sizes.length > 0) {
      product.sizes.forEach((size: any) => {
        csvContent += [
          `"${size.size_value}"`,
          `"${size.size_unit}"`,
          `"${size.price}"`,
          `"${size.stock}"`,
          `"${size.quantity_per_case}"`,
        ].join(",") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${product.name.replace(/[^a-z0-9]/gi, '_')}_inventory.csv`); // Sanitize filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-lg border border-gray-200 rounded-lg">
      <CardHeader className="bg-gray-100 rounded-t-lg px-6 py-4 border-b">
        <CardTitle className="text-lg font-semibold text-gray-800 flex justify-between items-center">
          Inventory Reports
          <button
            onClick={exportAllProductsToCsv}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
          >
            <Download size={16} /> Export All to CSV
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[450px] rounded-md border bg-white">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-100 text-gray-700 border-b shadow-sm">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Product Name</th>
                  <th className="px-5 py-3 text-left font-medium">Product Code</th>
                  <th className="px-5 py-3 text-left font-medium">Total Sizes</th>
                  <th className="px-5 py-3 text-left font-medium">Expand</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th> {/* New header */}
                </tr>
              </thead>
              <tbody>
                {products.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`border-b ${
                        index % 2 === 0 ? "bg-gray-50" : "bg-white"
                      } hover:bg-gray-100 transition-colors`}
                    >
                      <td className="px-5 py-4 font-medium">{item.name}</td>
                      <td className="px-5 py-4">{item.sku}</td>
                      <td className="px-5 py-4 text-center">{item.sizes.length}</td>
                      <td
                        className="px-5 py-4 text-center cursor-pointer hover:text-blue-600 transition"
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      >
                        {expanded === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => exportSingleProductToCsv(item)}
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-700 transition-colors text-sm"
                          title={`Export ${item.name} sizes to CSV`}
                        >
                          <Download size={16} /> Export
                        </button>
                      </td>
                    </tr>
                    {expanded === item.id && (
                      <tr>
                        <td colSpan={5} className="px-5 py-4 bg-gray-50"> {/* Adjusted colSpan to 5 */}
                          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-gray-700 mb-2">Size Details</h4>
                            <ul className="space-y-3">
                              {item.sizes.map((size: any, sizeIndex: number) => (
                                <li key={sizeIndex} className="flex justify-between p-3 border rounded-lg bg-gray-50 shadow-sm">
                                  <span className="font-medium text-gray-700">
                                    {size.size_value} {size.size_unit.toUpperCase()}
                                  </span>
                                  <span className="text-gray-600">Stock: {size.stock}</span>
                                  <span className="text-gray-600">Price: ${size.price}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};