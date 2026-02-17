import { Table, TableBody } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { LocationTableHeader } from "./table/LocationTableHeader";
import { LocationTableRow } from "./table/LocationTableRow";
import { LocationTablePagination } from "./table/LocationTablePagination";
import { Location } from "./types/location";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, ArrowUpDown, Download } from "lucide-react";
import { useState } from "react";
import LocationsModalView from "./component/LocationVIew";
import { supabase } from "@/integrations/supabase/client";
import { EditLocationPopup } from "./component/EditLocation";


interface LocationsTableProps {
  locations: any[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  fetchLocations?: () => void;
}

export function LocationsTable({
  locations,
  currentPage,
  totalPages,
  onPageChange,
  fetchLocations
}: LocationsTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [onView, setOnView] = useState(false);
  const [onEdit, setOnEdit] = useState(false);


  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleView = (locationId: number) => {
    setOnView(true);

    // Filter the selected location
    const filteredLocation = locations.find(loc => loc.id === locationId);
    setSelectedLocation(filteredLocation || null);

    console.log("Filtered Location:", filteredLocation);

    // toast({
    //   title: "Location Details",
    //   description: "Opening location details view...",
    // });
  };

  const handleEdit = async (locationId: number) => {
    try {
      setOnEdit(true)
      // Ensure locationId is valid
      if (!locationId) {
        throw new Error("Invalid location ID");
      }

      // Fetch location data from Supabase
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", String(locationId))
        .single();

      // Check if an error occurred during fetch
      if (error) {
        console.error("Error fetching location:", error.message);
        alert("Failed to fetch location details. Please try again.");
        return;
      }

      // Handle case where no data is found
      if (!data) {
        console.warn("No location found for ID:", locationId);
        alert("Location not found. Please check the ID.");
        return;
      }

      // Set selected location state
      console.log("Fetched Location Data:", data);
      setSelectedLocation(data);
    } catch (err) {
      console.error("Unexpected error in handleEdit:", err);
      alert("An unexpected error occurred. Please try again later.");
    }
  };

  const handleSubmit = async () => {
    try {
      console.log("object")
    } catch (err) {
      console.error("Unexpected error in handleEdit:", err);
      alert("An unexpected error occurred. Please try again later.");
    }
  };


  const handleExport = () => {
    const csvContent = [
      ["Name", "Address", "Status", "Manager", , "Last Active"].join(","),
      ...filteredLocations.map(location => [
        location.name,
        location.address,
        location.status,
        location.manager,
        // location.ordersThisMonth,
        location.lastActive
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'locations.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Location data has been exported to CSV",
    });
  };

  const toggleSortOrder = () => {
    setSortOrder(current => current === "asc" ? "desc" : "asc");
  };

  const filteredLocations = locations
    .filter(location =>
      (location.name.toLowerCase().includes(searchTerm.toLowerCase())))
    .sort((a, b) => {
      const modifier = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "name") return modifier * a.name.localeCompare(b.name);

      return 0;
    });

  return (
    <div className="space-y-4">
      {/* Enhanced Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
        <div className="flex-1">
          <Input
            placeholder="🔍 Search locations by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] border-gray-300">
              <Filter className="w-4 h-4 mr-2 text-gray-600" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">✓ Active</SelectItem>
              <SelectItem value="inactive">✗ Inactive</SelectItem>
              <SelectItem value="pending">⏳ Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] border-gray-300">
              <ArrowUpDown className="w-4 h-4 mr-2 text-gray-600" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="lastActive">Last Active</SelectItem>
              <SelectItem value="ordersThisMonth">Orders</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSortOrder}
            className="px-3 border-gray-300 hover:bg-gray-100"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2 border-gray-300 hover:bg-gray-100"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredLocations.length}</span> of <span className="font-semibold text-gray-900">{locations.length}</span> locations
        </p>
      </div>

      {/* Enhanced Table */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <LocationTableHeader />
            <TableBody>
              {filteredLocations.length > 0 ? (
                filteredLocations.map((location, index) => (
                  <LocationTableRow
                    key={index}
                    location={location}
                    onView={handleView}
                    onEdit={handleEdit}
                    getStatusColor={getStatusColor}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="h-12 w-12 text-gray-300" />
                      <p className="text-gray-500 font-medium">No locations found</p>
                      <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        {

          onView && selectedLocation && <LocationsModalView location={selectedLocation} onClose={() => { setOnView(false); setSelectedLocation(null) }} />
        }
        {

          onEdit && selectedLocation &&
           <EditLocationPopup 
           userData={selectedLocation}
            open={onEdit} 
            onOpenChange={() => { setOnEdit(false); setSelectedLocation(null) }}
             onSave={() => fetchLocations()} />
        }
      </div>

      <LocationTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}