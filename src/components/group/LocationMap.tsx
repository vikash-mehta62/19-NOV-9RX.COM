import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Location } from "./types/location";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface LocationMapProps {
  locations: Location[];
}

export function LocationMap({ locations }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const { toast } = useToast();

  // Use a default public token - in production this should come from environment variables
  const mapboxToken =
    "pk.eyJ1IjoibG92YWJsZSIsImEiOiJja2VpbDE4b2UwbzJvMnJvNmV5ZDlhZGl4In0.Zv4Hh1TwQsYT1K0NhPGhJw";

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || isMapInitialized) return;

    try {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-98.5795, 39.8283],
        zoom: 3,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      locations.forEach((location) => {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <h3 class="font-bold">${location.name}</h3>
              <p class="text-sm text-gray-600">${location.address}</p>
              <div class="mt-2">
                <span class="inline-block px-2 py-1 text-xs rounded ${
                  location.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }">
                  ${location.status}
                </span>
              </div>
              ${
                location.manager
                  ? `
                <div class="mt-2 text-sm">
                  <strong>Manager:</strong> ${location.manager}
                </div>
              `
                  : ""
              }
              ${
                location.ordersThisMonth
                  ? `
                <div class="mt-1 text-sm">
                  <strong>Orders this month:</strong> ${location.ordersThisMonth}
                </div>
              `
                  : ""
              }
            </div>
          `);

        const el = document.createElement("div");
        el.className = "marker";
        el.style.backgroundColor =
          location.status === "active" ? "#22c55e" : "#ef4444";
        el.style.width = "24px";
        el.style.height = "24px";
        el.style.borderRadius = "50%";
        el.style.cursor = "pointer";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";

        // For demo purposes, generating random coordinates around USA
        const lat = 39.8283 + (Math.random() - 0.5) * 20;
        const lng = -98.5795 + (Math.random() - 0.5) * 40;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current);

        // Add click handler for marker
        el.addEventListener("click", () => {
          setSelectedLocation(location);
          toast({
            title: "Location Selected",
            description: `Viewing details for ${location.name}`,
          });
        });
      });

      setIsMapInitialized(true);
    } catch (error) {
      console.error("Error initializing map:", error);
      toast({
        title: "Map Error",
        description: "There was an error initializing the map",
        variant: "destructive",
      });
    }
  }, [mapboxToken, locations, toast]);

  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  return (
    <div>
      {/* <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Location Overview</span>
          {selectedLocation && (
            <Badge variant={selectedLocation.status === 'active' ? 'success' : 'destructive'}>
              {selectedLocation.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full rounded-md overflow-hidden">
          <div ref={mapContainer} className="w-full h-full" />
        </div>
        {selectedLocation && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">{selectedLocation.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Address</p>
                <p>{selectedLocation.address}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Manager</p>
                <p>{selectedLocation.manager}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={selectedLocation.status === 'active' ? 'success' : 'destructive'}>
                  {selectedLocation.status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Orders This Month</p>
                <p>{selectedLocation.ordersThisMonth}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card> */}
    </div>
  );
}
