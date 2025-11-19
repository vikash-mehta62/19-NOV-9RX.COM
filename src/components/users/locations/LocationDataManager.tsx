import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { LocationData } from "../schemas/userFormSchemas";
import { useToast } from "@/hooks/use-toast";

interface LocationDataManagerProps {
  locations: LocationData[];
  onImport: (locations: LocationData[]) => void;
}

export function LocationDataManager({
  locations,
  onImport,
}: LocationDataManagerProps) {
  const { toast } = useToast();

  const handleExport = () => {
    const csvContent = [
      ["Name", "Type", "Status", "Address", "Manager", "Contact Email"].join(
        ","
      ),
      ...locations.map((location) =>
        [
          location.name,
          location.type,
          location.status,
          `${location.address.street1}, ${location.address.city}, ${location.address.state}`,
          location.manager || "",
          location.contactEmail || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "locations.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Location data has been exported to CSV",
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split("\n").slice(1); // Skip header
          const importedLocations: LocationData[] = rows.map((row) => {
            const [name, type, status, address, manager, contactEmail] =
              row.split(",");
            const [street1, city, state] = address.split(", ");

            return {
              name,
              type: type as LocationData["type"],
              status: status as LocationData["status"],
              address: {
                street1,
                city,
                state,
                attention: "",
                countryRegion: "",
                street2: "",
                zip_code: "",
                phone: "",
                faxNumber: "",
              },
              manager,
              contactEmail,
            };
          });

          onImport(importedLocations);
          toast({
            title: "Import Successful",
            description: `${importedLocations.length} locations imported`,
          });
        } catch (error) {
          toast({
            title: "Import Failed",
            description: "Please check your CSV file format",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location Data Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export to CSV
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import from CSV
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <FileSpreadsheet className="h-4 w-4 inline-block mr-2" />
          Supported format: CSV with headers (Name, Type, Status, Address,
          Manager, Contact Email)
        </div>
      </CardContent>
    </Card>
  );
}
