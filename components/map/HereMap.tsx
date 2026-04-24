"use client";

import { useEffect, useRef } from "react";
import { getIconBase64 } from "@/lib/getIconBase64";

const CATEGORY_ICONS: Record<string, string> = {
  "Food":             "food",
  "Coffee":           "cafe",
  "Candy":            "candy",
  "Fresh Fruit":      "fruits",
  "Beverages":        "beverages",
  "Flowers":          "flowers",
  "Desserts":         "desserts",
  "Other":            "other",
  "Personal Care":    "personal-care",
  "Wellness":         "wellness",
  "Fitness":          "fitness",
  "Event Services":   "event-services",
  "Custom Designs":   "custom-design",
  "Handmade":         "handmade",
  "Event":            "event",
  "Merchandise":      "merchandise",
  "General Services": "general-services",
  "Apparel":          "apparel",
  "Event Space":      "event-space",
  "Collectables":     "collectables",
  "Jewelry":          "jewelry",
  "Art":              "art",
};

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.type = "text/javascript";
    script.onload = () => resolve();
    script.onerror = () => reject(
      new Error(`Failed to load: ${src}`)
    );
    document.head.appendChild(script);
  });
};

const loadCSS = (href: string): void => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

const wait = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

interface HereMapProps {
  onMarkerTap: (location: any) => void;
}

export default function HereMap({ onMarkerTap }: HereMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  const getMarkerColor = (
    type: string,
    subType: string
  ): string | null => {
    if (subType === "street_vendor") return "#E63946";
    if (subType === "food_truck")    return "#1B4FE4";
    if (subType === "home_based")    return "#7B2D8B";
    if (subType === "pop_up")        return "#FF006E";
    if (subType === "market")        return "#2D6A4F";
    return null;
  };

  const addMarkers = async (H: any, map: any) => {
    try {
      const res = await fetch("/api/businesses/locations");
      const { locations } = await res.json();

      if (!locations || locations.length === 0) {
        console.log("No locations found");
        return;
      }

      for (const location of locations) {
        const color = getMarkerColor(
          location.type,
          location.sub_type
        );

        if (!color) continue;

        const iconFile =
          CATEGORY_ICONS[location.category] || "other";

        const base64Icon = await getIconBase64(iconFile);

        const svgMarkup = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/><image href="${base64Icon}" x="10" y="10" width="20" height="20"/></svg>`;

        const icon = new H.map.Icon(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
          {
            size: { w: 40, h: 40 },
            anchor: { x: 20, y: 20 },
          }
        );

        const marker = new H.map.Marker(
          { lat: location.lat, lng: location.lng },
          { icon }
        );

        marker.setData(location);

        // Pass location data to parent via onMarkerTap
        marker.addEventListener("tap", (evt: any) => {
          onMarkerTap(evt.target.getData());
        });

        map.addObject(marker);
        console.log(`Marker added: ${location.name}`);
      }

    } catch (error) {
      console.error("Error adding markers:", error);
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initMap = async () => {
      try {
        loadCSS(
          "https://js.api.here.com/v3/3.1/mapsjs-ui.css"
        );

        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-core.js"
        );
        await wait(100);

        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-service.js"
        );
        await wait(100);

        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-ui.js"
        );
        await wait(100);

        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-mapevents.js"
        );
        await wait(300);

        const H = (window as any).H;

        if (!H || !H.mapevents) {
          console.error("HERE Maps not available");
          return;
        }

        const positronLayer = new H.map.layer.TileLayer(
          new H.map.provider.ImageTileProvider({
            getURL: (
              col: number,
              row: number,
              zoom: number
            ) => {
              return `https://a.basemaps.cartocdn.com/light_all/${zoom}/${col}/${row}@2x.png`;
            },
            min: 0,
            max: 19,
            opacity: 1.0,
            tileSize: 512,
          })
        );

        const map = new H.Map(
          mapRef.current,
          positronLayer,
          {
            zoom: 11,
            center: { lat: 34.0522, lng: -118.2437 },
            pixelRatio: window.devicePixelRatio || 1,
          }
        );

        const mapEvents = new H.mapevents.MapEvents(map);
        new H.mapevents.Behavior(mapEvents);

        window.addEventListener("resize", () => {
          map.getViewPort().resize();
        });

        mapInstance.current = map;

        await addMarkers(H, map);

        console.log("HERE Maps initialized");

      } catch (error) {
        console.error("HERE Maps error:", error);
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.dispose();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <div
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}