import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, MapPin, User, ShoppingCart, Clock } from "lucide-react";

export function LocationTableHeader() {
  return (
    <TableHeader>
      <TableRow className="sticky top-0 bg-white z-10  ">
        <TableHead className="bg-white">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Location Name
          </div>
        </TableHead>
        <TableHead className="bg-white">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </div>
        </TableHead>
        {/* <TableHead className="bg-white">Status</TableHead> */}
        <TableHead className="bg-white">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Details
          </div>
        </TableHead>
        {/* <TableHead className="bg-white">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Orders This Month
          </div>
        </TableHead> */}
        {/* <TableHead className="bg-white">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Last Active
          </div>
        </TableHead> */}
        <TableHead className="bg-white">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}