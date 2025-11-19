import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VialProduct } from "@/types/pharmacy";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const vialProducts: VialProduct[] = [
  {
    id: "1",
    size: "9DR",
    quantity: 385,
    price1: 33.49,
    pricePerUnit1: 0.086987,
    price2: 38.49,
    pricePerUnit2: 0.099974,
    stock: 100,
  },
  {
    id: "2",
    size: "13DR",
    quantity: 280,
    price1: 32.23,
    pricePerUnit1: 0.115107,
    price2: 37.23,
    pricePerUnit2: 0.132964,
    stock: 75,
  },
  {
    id: "3",
    size: "16DR",
    quantity: 240,
    price1: 33.09,
    pricePerUnit1: 0.137875,
    price2: 38.09,
    pricePerUnit2: 0.158708,
    stock: 45,
  },
  {
    id: "4",
    size: "20DR",
    quantity: 200,
    price1: 32.69,
    pricePerUnit1: 0.16345,
    price2: 37.69,
    pricePerUnit2: 0.18845,
    stock: 30,
  },
  {
    id: "5",
    size: "30DR",
    quantity: 150,
    price1: 29.43,
    pricePerUnit1: 0.1962,
    price2: 34.43,
    pricePerUnit2: 0.229533,
    stock: 15,
  },
  {
    id: "6",
    size: "40DR",
    quantity: 100,
    price1: 28.89,
    pricePerUnit1: 0.2889,
    price2: 33.89,
    pricePerUnit2: 0.3389,
    stock: 10,
  },
  {
    id: "7",
    size: "60DR",
    quantity: 70,
    price1: 28.27,
    pricePerUnit1: 0.403857,
    price2: 33.27,
    pricePerUnit2: 0.475286,
    stock: 5,
  },
];

interface VialProductsTableProps {
  isLoading?: boolean;
}

export function VialProductsTable({ isLoading = false }: VialProductsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = vialProducts.filter((product) =>
    product.size.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Multiple Sizes Available</Badge>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by size..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Size</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Price Tier 1</TableHead>
              <TableHead className="text-right">Price/Unit (T1)</TableHead>
              <TableHead className="text-right">Price Tier 2</TableHead>
              <TableHead className="text-right">Price/Unit (T2)</TableHead>
              <TableHead className="text-right">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.size}</TableCell>
                <TableCell>{product.quantity}</TableCell>
                <TableCell className="text-right">
                  ${product.price1.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ${product.pricePerUnit1.toFixed(4)}
                </TableCell>
                <TableCell className="text-right">
                  ${product.price2.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ${product.pricePerUnit2.toFixed(4)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={product.stock > 50 ? "success" : product.stock > 20 ? "warning" : "destructive"}
                  >
                    {product.stock}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
