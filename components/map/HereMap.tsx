"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";

const PRIMARY = "#FF7300";
import { getIconBase64 } from "@/lib/getIconBase64";
import {
  BusinessFilters,
  EMPTY_FILTERS,
  filtersToParams,
} from "@/lib/businessFilters";

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

const CLUSTER_ZOOM_THRESHOLD = 12;

// Marker color per business sub_type — the single source of truth shared by the
// map markers (getMarkerColor) and the map page's legend/filter chips. Order
// here is the order chips render in. Only sub_types that actually appear on the
// map are listed; getMarkerColor falls back to type-based colors for the rest.
export const SUB_TYPE_LEGEND: { value: string; label: string; color: string }[] =
  [
    { value: "street_vendor", label: "Street Vendor", color: "#E63946" },
    { value: "food_truck",    label: "Food Truck",    color: "#123C38" },
    { value: "home_based",    label: "Home-Based",    color: "#7B2D8B" },
    { value: "market",        label: "Market",        color: "#2D6A4F" },
    { value: "pop_up",        label: "Pop-Up",        color: "#FF006E" },
  ];

const SUB_TYPE_COLORS: Record<string, string> = Object.fromEntries(
  SUB_TYPE_LEGEND.map((s) => [s.value, s.color])
);

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
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface HereMapProps {
  onMarkerTap: (location: any) => void;
  searchQuery?: string;
  categoryFilter?: string;
  filters?: BusinessFilters;
  /** The visitor's current position, shown as a "you are here" dot. */
  userLocation?: { lat: number; lng: number } | null;
}

/** Imperative API exposed to parents via ref. */
export interface HereMapHandle {
  /** Pan/zoom back to the visitor's current position. No-op if no fix yet. */
  recenter: () => void;
}

const HereMap = forwardRef<HereMapHandle, HereMapProps>(function HereMap(
  {
    onMarkerTap,
    searchQuery = "",
    categoryFilter = "",
    filters = EMPTY_FILTERS,
    userLocation = null,
  },
  ref
) {
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const hRef = useRef<any>(null);
  const locationsRef = useRef<any[]>([]);
  // The "you are here" marker is kept off to the side of the business markers
  // so it survives the removeObjects() wipe in renderMarkers and can be
  // re-added after every marker swap.
  const userMarkerRef = useRef<any>(null);
  // Latest known position, mirrored into a ref so initMap can place the dot
  // immediately if a fix arrived before the map finished loading.
  const userLocationRef = useRef(userLocation);
  // True until we've recentered the map on the first geolocation fix, so we
  // only auto-pan once and don't fight the user panning afterwards.
  const pendingRecenterRef = useRef(true);
  const onMarkerTapRef = useRef(onMarkerTap);
  // Monotonic token: every render request bumps it. A render only touches the
  // map if it is still the latest request, so stale/overlapping renders abort
  // instead of racing each other's removeObjects/addObjects.
  const renderGenRef = useRef(0);
  // tracks whether the last render was in cluster mode so we only
  // re-render from the viewport listener when crossing the threshold
  const lastWasClusteredRef = useRef<boolean | null>(null);


  useEffect(() => {
    onMarkerTapRef.current = onMarkerTap;
  }, [onMarkerTap]);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      const map = mapInstance.current;
      const fix = userLocationRef.current;
      if (!map || !fix) return;
      map.getViewModel().setLookAtData(
        { position: fix, zoom: Math.max(map.getZoom(), 13) },
        true
      );
    },
  }), []);

  const getMarkerColor = (
    type: string,
    subType: string | null
  ): string | null => {
    if (subType && SUB_TYPE_COLORS[subType]) return SUB_TYPE_COLORS[subType];
    if (type === "permanent_location") return "#E63946";
    return null;
  };

  // Google-Maps-style blue location dot: a soft accuracy halo behind a solid
  // blue dot with a white ring. Used for the visitor's own position.
  const createUserMarker = (H: any, lat: number, lng: number) => {
    const svgMarkup = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="16" fill="#4285F4" fill-opacity="0.18"/><circle cx="18" cy="18" r="7" fill="#4285F4" stroke="white" stroke-width="2.5"/></svg>`;
    const icon = new H.map.Icon(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
      { size: { w: 36, h: 36 }, anchor: { x: 18, y: 18 } }
    );
    // High z-index keeps the dot above business/cluster markers.
    return new H.map.Marker({ lat, lng }, { icon, zIndex: 1000 });
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
          fill="${PRIMARY}" fill-opacity="0.35"
          stroke="${PRIMARY}" stroke-width="2"
          stroke-opacity="0.6"/>
        <circle cx="25" cy="25" r="15"
          fill="${PRIMARY}" fill-opacity="0.7"/>
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
      { size: { w: 50, h: 50 }, anchor: { x: 25, y: 25 } }
    );
    return new H.map.Marker({ lat, lng }, { icon });
  };

  // Builds a single business marker (off-map). Returns null if the location
  // has no color mapping. Does NOT add anything to the map.
  const buildMarker = async (
    H: any,
    location: any,
    lat: number,
    lng: number
  ) => {
    const color = getMarkerColor(location.type, location.sub_type);
    if (!color) return null;

    const iconFile =
      location.type === "event"
        ? "event"
        : CATEGORY_ICONS[location.category] || "other";
    const base64Icon = await getIconBase64(iconFile);

    const svgMarkup = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/><image href="${base64Icon}" x="10" y="10" width="20" height="20"/></svg>`;

    const icon = new H.map.Icon(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
      { size: { w: 40, h: 40 }, anchor: { x: 20, y: 20 } }
    );

    const marker = new H.map.Marker({ lat, lng }, { icon });
    marker.setData(location);
    marker.addEventListener("tap", (evt: any) => {
      onMarkerTapRef.current(evt.target.getData());
    });
    return marker;
  };

  // Builds fanned-out markers for locations that share the exact same point,
  // plus a small center dot. Returns the array of objects (off-map).
  const buildOffsetMarkers = async (H: any, locations: any[]) => {
    const offsetDistance = 0.0002;

    const built = await Promise.all(
      locations.map((location, i) => {
        const angle = (i / locations.length) * 2 * Math.PI;
        const offsetLat = location.lat + offsetDistance * Math.cos(angle);
        const offsetLng = location.lng + offsetDistance * Math.sin(angle);
        return buildMarker(H, location, offsetLat, offsetLng);
      })
    );

    const objects: any[] = built.filter(Boolean);

    const dotSvg = `<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="5" fill="white" stroke="#ccc" stroke-width="1.5"/></svg>`;
    const dotIcon = new H.map.Icon(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dotSvg)}`,
      { size: { w: 12, h: 12 }, anchor: { x: 6, y: 6 } }
    );
    objects.push(
      new H.map.Marker(
        { lat: locations[0].lat, lng: locations[0].lng },
        { icon: dotIcon }
      )
    );
    return objects;
  };

  // Builds cluster bubbles + standalone markers (off-map).
  const buildClusterObjects = async (H: any, map: any, locations: any[]) => {
    const gridSize = 0.05;
    const clusters: Record<
      string,
      { lats: number[]; lngs: number[]; count: number; locations: any[] }
    > = {};

    locations.forEach((location) => {
      const gridLat = Math.round(location.lat / gridSize) * gridSize;
      const gridLng = Math.round(location.lng / gridSize) * gridSize;
      const key = `${gridLat},${gridLng}`;
      if (!clusters[key]) {
        clusters[key] = { lats: [], lngs: [], count: 0, locations: [] };
      }
      clusters[key].lats.push(location.lat);
      clusters[key].lngs.push(location.lng);
      clusters[key].count++;
      clusters[key].locations.push(location);
    });

    const objects: any[] = [];

    for (const cluster of Object.values(clusters)) {
      const avgLat =
        cluster.lats.reduce((a, b) => a + b, 0) / cluster.lats.length;
      const avgLng =
        cluster.lngs.reduce((a, b) => a + b, 0) / cluster.lngs.length;

      if (cluster.count === 1) {
        const loc = cluster.locations[0];
        const m = await buildMarker(H, loc, loc.lat, loc.lng);
        if (m) objects.push(m);
      } else {
        const clusterMarker = createClusterMarker(H, avgLat, avgLng, cluster.count);
        clusterMarker.addEventListener("tap", () => {
          map.getViewModel().setLookAtData(
            {
              position: { lat: avgLat, lng: avgLng },
              zoom: CLUSTER_ZOOM_THRESHOLD + 1,
            },
            true,
            // Faster zoom-in: shorten the animation duration (default ~600ms).
            { duration: 250, ease: H.util.animation.ease.EASE_OUT }
          );
        });
        objects.push(clusterMarker);
      }
    }
    return objects;
  };

  // Builds the full marker set off-map, then performs a single atomic swap.
  // `gen` guards against stale renders: if a newer request started while we
  // were building, we abort before touching the map.
  const renderMarkers = async (
    H: any,
    map: any,
    locations: any[],
    zoom: number,
    gen: number
  ) => {
    let objects: any[] = [];

    if (locations.length) {
      if (zoom < CLUSTER_ZOOM_THRESHOLD) {
        objects = await buildClusterObjects(H, map, locations);
      } else {
        const grouped: Record<string, any[]> = {};
        for (const location of locations) {
          const key = `${location.lat},${location.lng}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(location);
        }
        const built = await Promise.all(
          Object.values(grouped).map((group) =>
            group.length === 1
              ? buildMarker(H, group[0], group[0].lat, group[0].lng).then(
                  (m) => (m ? [m] : [])
                )
              : buildOffsetMarkers(H, group)
          )
        );
        objects = built.flat();
      }
    }

    // A newer render superseded us while we were building — drop this one.
    if (gen !== renderGenRef.current) return;

    map.removeObjects(map.getObjects());
    if (objects.length) map.addObjects(objects);
    // The wipe above removes the user dot too; put it back on top.
    if (userMarkerRef.current) map.addObject(userMarkerRef.current);
  };

  const fetchLocations = async (
    query: string,
    category: string,
    activeFilters: BusinessFilters
  ) => {
    const H = hRef.current;
    const map = mapInstance.current;
    if (!H || !map) return;

    const gen = ++renderGenRef.current;

    try {
      const params = filtersToParams(activeFilters);
      if (query) params.set("q", query);
      // "Events" filters by business type rather than category.
      if (category === "Events") {
        params.set("type", "event");
      } else if (category) {
        params.set("category", category);
      }
      const qs = params.toString();
      const res = await fetch(
        `/api/businesses/locations${qs ? `?${qs}` : ""}`
      );
      const { locations } = await res.json();

      // A newer fetch started while this one was in flight — abandon it.
      if (gen !== renderGenRef.current) return;

      const next = locations || [];
      locationsRef.current = next;
      const zoom = map.getZoom();
      lastWasClusteredRef.current = next.length
        ? zoom < CLUSTER_ZOOM_THRESHOLD
        : null;

      await renderMarkers(H, map, next, zoom, gen);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // initMap is async and slow (script loads), so it sets mapInstance.current
    // late. Under React Strict Mode the effect runs twice; this flag lets the
    // first run abort once it has been cleaned up, so only ONE map is created.
    let cancelled = false;

    const initMap = async () => {
      try {
        loadCSS("https://js.api.here.com/v3/3.1/mapsjs-ui.css");

        await loadScript("https://js.api.here.com/v3/3.1/mapsjs-core.js");
        await wait(100);
        await loadScript("https://js.api.here.com/v3/3.1/mapsjs-service.js");
        await wait(100);
        await loadScript("https://js.api.here.com/v3/3.1/mapsjs-ui.js");
        await wait(100);
        await loadScript("https://js.api.here.com/v3/3.1/mapsjs-mapevents.js");
        await wait(300);

        if (cancelled || mapInstance.current) return;

        const H = (window as any).H;
        if (!H || !H.mapevents) {
          console.error("HERE Maps not available");
          return;
        }

        const positronLayer = new H.map.layer.TileLayer(
          new H.map.provider.ImageTileProvider({
            getURL: (col: number, row: number, zoom: number) =>
              `https://a.basemaps.cartocdn.com/light_all/${zoom}/${col}/${row}@2x.png`,
            min: 0,
            max: 19,
            opacity: 1.0,
            tileSize: 512,
          })
        );

        const map = new H.Map(mapRef.current, positronLayer, {
          zoom: 11,
          center: { lat: 34.0522, lng: -118.2437 },
          pixelRatio: window.devicePixelRatio || 1,
        });

        // Cleaned up while constructing — tear down and bail.
        if (cancelled) {
          map.dispose();
          return;
        }

        const mapEvents = new H.mapevents.MapEvents(map);
        new H.mapevents.Behavior(mapEvents);

        window.addEventListener("resize", () => {
          map.getViewPort().resize();
        });

        hRef.current = H;
        mapInstance.current = map;

        // A geolocation fix may have arrived before the map finished loading;
        // drop the dot now (and recenter once) so it isn't lost until the next
        // position update.
        const fix = userLocationRef.current;
        if (fix) {
          userMarkerRef.current = createUserMarker(H, fix.lat, fix.lng);
          map.addObject(userMarkerRef.current);
          if (pendingRecenterRef.current) {
            pendingRecenterRef.current = false;
            map.getViewModel().setLookAtData(
              { position: fix, zoom: Math.max(map.getZoom(), 13) },
              true
            );
          }
        }

        // Only re-render when crossing the cluster/individual threshold,
        // never on plain pans. Generation token keeps it from racing fetches.
        map.addEventListener("mapviewchangeend", async () => {
          if (!locationsRef.current.length) return;

          const zoom = map.getZoom();
          const isClustered = zoom < CLUSTER_ZOOM_THRESHOLD;

          if (lastWasClusteredRef.current === isClustered) return;
          lastWasClusteredRef.current = isClustered;

          const gen = ++renderGenRef.current;
          await renderMarkers(hRef.current, map, locationsRef.current, zoom, gen);
        });

        await fetchLocations(searchQuery, categoryFilter, filters);

        if (!cancelled) setMapReady(true);
        console.log("HERE Maps initialized");
      } catch (error) {
        console.error("HERE Maps error:", error);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.dispose();
        mapInstance.current = null;
        hRef.current = null;
      }
    };
  }, []);

  // Re-fetch markers whenever search, category, or filters change
  useEffect(() => {
    fetchLocations(searchQuery, categoryFilter, filters);
  }, [searchQuery, categoryFilter, filters]);

  // Add / move / remove the "you are here" dot as the visitor's position
  // changes. The map may not be ready on the first fix (script still loading),
  // so we bail and re-run once mapInstance is set on a later change.
  useEffect(() => {
    userLocationRef.current = userLocation;
    const H = hRef.current;
    const map = mapInstance.current;
    if (!H || !map) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        map.removeObject(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    const { lat, lng } = userLocation;
    if (userMarkerRef.current) {
      userMarkerRef.current.setGeometry({ lat, lng });
    } else {
      userMarkerRef.current = createUserMarker(H, lat, lng);
      map.addObject(userMarkerRef.current);
    }

    // Pan to the visitor once, on the first fix only.
    if (pendingRecenterRef.current) {
      pendingRecenterRef.current = false;
      map.getViewModel().setLookAtData(
        { position: { lat, lng }, zoom: Math.max(map.getZoom(), 13) },
        true
      );
    }
  }, [userLocation]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {!mapReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FF7300",
          }}
        >
          <motion.img
            src="/VmapsSlogan.png"
            alt="VendorMaps"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ width: 280, height: 280, objectFit: "contain" }}
          />
        </div>
      )}
    </div>
  );
});

export default HereMap;
