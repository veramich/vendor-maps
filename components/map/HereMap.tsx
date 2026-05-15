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

const CLUSTER_ZOOM_THRESHOLD = 13;

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

export default function HereMap({
  onMarkerTap,
}: HereMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  const getMarkerColor = (
    type: string,
    subType: string | null
  ): string | null => {
    if (subType === "street_vendor") return "#E63946";
    if (subType === "food_truck")    return "#1B4FE4";
    if (subType === "home_based")    return "#7B2D8B";
    if (subType === "pop_up")        return "#FF006E";
    if (subType === "market")        return "#2D6A4F";
    if (type === "permanent_location") return "#E63946";

    return null;
  };

  const createClusterMarker = (
    H: any,
    lat: number,
    lng: number,
    count: number
  ) => {
    const svgMarkup = `
      <svg width="50" height="50"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="25" r="22"
          fill="#FF7300" fill-opacity="0.35"
          stroke="#FF7300" stroke-width="2"
          stroke-opacity="0.6"/>
        <circle cx="25" cy="25" r="15"
          fill="#FF7300" fill-opacity="0.7"/>
        <text x="25" y="30"
          text-anchor="middle"
          font-family="sans-serif"
          font-size="13"
          font-weight="bold"
          fill="white">
          ${count}
        </text>
      </svg>
    `;

    const icon = new H.map.Icon(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
      {
        size: { w: 50, h: 50 },
        anchor: { x: 25, y: 25 },
      }
    );

    return new H.map.Marker(
      { lat, lng },
      { icon }
    );
  };

  const addSingleMarker = async (
    H: any,
    map: any,
    location: any
  ) => {
    const color = getMarkerColor(
      location.type,
      location.sub_type
    );
    if (!color) return;

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
    marker.addEventListener("tap", (evt: any) => {
      onMarkerTap(evt.target.getData());
    });

    map.addObject(marker);
  };

  const addOffsetMarkers = async (
    H: any,
    map: any,
    locations: any[]
  ) => {
    const offsetDistance = 0.0002;

    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      const color = getMarkerColor(
        location.type,
        location.sub_type
      );
      if (!color) continue;

      const angle =
        (i / locations.length) * 2 * Math.PI;
      const offsetLat =
        location.lat + offsetDistance * Math.cos(angle);
      const offsetLng =
        location.lng + offsetDistance * Math.sin(angle);

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
        { lat: offsetLat, lng: offsetLng },
        { icon }
      );

      marker.setData(location);
      marker.addEventListener("tap", (evt: any) => {
        onMarkerTap(evt.target.getData());
      });

      map.addObject(marker);
    }

    // Small dot at actual intersection
    const dotSvg = `<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="5" fill="white" stroke="#ccc" stroke-width="1.5"/></svg>`;

    const dotIcon = new H.map.Icon(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dotSvg)}`,
      { size: { w: 12, h: 12 }, anchor: { x: 6, y: 6 } }
    );

    const dot = new H.map.Marker(
      { lat: locations[0].lat, lng: locations[0].lng },
      { icon: dotIcon }
    );

    map.addObject(dot);
  };

  const renderClusters = async (
    H: any,
    map: any,
    locations: any[]
  ) => {
    const gridSize = 0.05;
    const clusters: Record<string, {
      lats: number[];
      lngs: number[];
      count: number;
      locations: any[];
    }> = {};

    locations.forEach(location => {
      // Use grid only as a grouping key
      const gridLat = Math.round(
        location.lat / gridSize
      ) * gridSize;
      const gridLng = Math.round(
        location.lng / gridSize
      ) * gridSize;
      const key = `${gridLat},${gridLng}`;

      if (!clusters[key]) {
        clusters[key] = {
          lats:      [],
          lngs:      [],
          count:     0,
          locations: [],
        };
      }
      clusters[key].lats.push(location.lat);
      clusters[key].lngs.push(location.lng);
      clusters[key].count++;
      clusters[key].locations.push(location);
    });

    for (const cluster of Object.values(clusters)) {
      // Use average position of all locations
      // in this cluster instead of grid center
      const avgLat =
        cluster.lats.reduce((a, b) => a + b, 0) /
        cluster.lats.length;
      const avgLng =
        cluster.lngs.reduce((a, b) => a + b, 0) /
        cluster.lngs.length;

      if (cluster.count === 1) {
        await addSingleMarker(
          H, map, cluster.locations[0]
        );
      } else {
        const clusterMarker = createClusterMarker(
          H,
          avgLat,  // actual average position
          avgLng,  // actual average position
          cluster.count
        );

        clusterMarker.addEventListener("tap", () => {
          map.getViewModel().setLookAtData(
            {
              position: { lat: avgLat, lng: avgLng },
              zoom: CLUSTER_ZOOM_THRESHOLD + 1,
            },
            true // animate
          );
        });

        map.addObject(clusterMarker);
      }
    }
  };

  const renderMarkers = async (
    H: any,
    map: any,
    locations: any[],
    zoom: number
  ) => {
    map.removeObjects(map.getObjects());

    if (zoom < CLUSTER_ZOOM_THRESHOLD) {
      await renderClusters(H, map, locations);
    } else {
      const grouped: Record<string, any[]> = {};

      for (const location of locations) {
        const key = `${location.lat},${location.lng}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(location);
      }

      for (const group of Object.values(grouped)) {
        if (group.length === 1) {
          await addSingleMarker(H, map, group[0]);
        } else {
          await addOffsetMarkers(H, map, group);
        }
      }
    }
  };

  const addMarkers = async (H: any, map: any) => {
    try {
      const res = await fetch(
        "/api/businesses/locations"
      );
      const { locations } = await res.json();

      if (!locations || locations.length === 0) {
        console.log("No locations found");
        return;
      }

      const currentZoom = map.getZoom();
      await renderMarkers(
        H, map, locations, currentZoom
      );

      map.addEventListener(
        "mapviewchangeend",
        async () => {
          const zoom = map.getZoom();
          await renderMarkers(
            H, map, locations, zoom
          );
        }
      );

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
            ) =>
              `https://a.basemaps.cartocdn.com/light_all/${zoom}/${col}/${row}@2x.png`,
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