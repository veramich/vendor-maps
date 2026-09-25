"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";

const PRIMARY = "#FF7300";
import { getIconBase64 } from "@/lib/getIconBase64";
import { createBasemapLayer } from "@/lib/basemap";
import { CATEGORY_ICONS } from "@/components/map/categoryIcons";
import {
  BusinessFilters,
  EMPTY_FILTERS,
  filtersToParams,
} from "@/lib/businessFilters";

// A business location as returned by /api/businesses/locations. lat/lng come
// from PostGIS (ST_X/ST_Y) so are always present for mapped rows.
export interface MapLocation {
  id: string;
  slug: string;
  name: string;
  type: string;
  sub_type: string | null;
  category: string;
  icon_name: string | null;
  price_tier: number | null;
  avg_rating: number | null;
  review_count: number | null;
  lng: number;
  lat: number;
  neighborhood: string | null;
  city: string | null;
}

const CLUSTER_ZOOM_THRESHOLD = 12;

// Business markers are 40px circles centered on their point (outer edge ~19.5px
// out), so the popup's tail tip sits this far above the point to just clear
// the marker's top edge.
const POPUP_GAP = 22;
// Breathing room kept between an auto-panned popup and the viewport edges.
const POPUP_MARGIN = 12;

/** Screen area (px from each map edge) covered by UI the popup should avoid. */
export interface PopupInsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

// Markers carry their MapLocation as data. A business can have several
// locations, so match on the point too, not just the business id.
const isMarkerFor = (object: HMapObject, location: MapLocation) => {
  const data = object.getData<MapLocation | undefined>();
  return (
    !!data &&
    data.id === location.id &&
    data.lat === location.lat &&
    data.lng === location.lng
  );
};

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
  onMarkerTap: (location: MapLocation) => void;
  searchQuery?: string;
  categoryFilter?: string;
  filters?: BusinessFilters;
  /** The visitor's current position, shown as a "you are here" dot. */
  userLocation?: { lat: number; lng: number } | null;
  /** The location whose popup is open. The popup pops out of its marker and
   *  follows it as the map pans and zooms. */
  selected?: MapLocation | null;
  /** Content of the popup bubble shown above the selected marker. */
  renderPopup?: (location: MapLocation) => ReactNode;
  /** Called when the popup should close: a tap on empty map, or the selected
   *  marker leaving the map (e.g. folding into a cluster on zoom-out). The
   *  parent should clear `selected`. */
  onPopupClose?: () => void;
  /** Read when a popup opens: map areas covered by overlays (search bar,
   *  chips). The map pans so a freshly opened popup isn't hidden under them. */
  getPopupInsets?: () => PopupInsets;
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
    selected = null,
    renderPopup,
    onPopupClose,
    getPopupInsets,
  },
  ref
) {
  const [mapReady, setMapReady] = useState(false);
  const reduceMotion = useReducedMotion();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<HMap | null>(null);
  const hRef = useRef<HNamespace | null>(null);
  const locationsRef = useRef<MapLocation[]>([]);
  // The "you are here" marker is kept off to the side of the business markers
  // so it survives the removeObjects() wipe in renderMarkers and can be
  // re-added after every marker swap.
  const userMarkerRef = useRef<HMapObject | null>(null);
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
  // Popup anchoring. The popup is a DOM overlay (not a HERE object), so on
  // every view change we project the selected marker's point to screen pixels
  // and move the anchor element there directly, skipping React re-renders.
  const selectedRef = useRef(selected);
  const anchorGeoRef = useRef<HGeoPoint | null>(null);
  const popupAnchorRef = useRef<HTMLDivElement>(null);
  const popupBoxRef = useRef<HTMLDivElement>(null);
  const onPopupCloseRef = useRef(onPopupClose);
  const getPopupInsetsRef = useRef(getPopupInsets);

  useEffect(() => {
    onMarkerTapRef.current = onMarkerTap;
    onPopupCloseRef.current = onPopupClose;
    getPopupInsetsRef.current = getPopupInsets;
  }, [onMarkerTap, onPopupClose, getPopupInsets]);

  // Moves the popup anchor to the selected marker's current screen position.
  // Runs on every frame of a pan/zoom, so it writes the style directly.
  const positionPopup = () => {
    const map = mapInstance.current;
    const anchor = popupAnchorRef.current;
    const geo = anchorGeoRef.current;
    if (!map || !anchor || !geo) return;
    const point = map.geoToScreen(geo);
    if (point) {
      anchor.style.transform = `translate(${point.x}px, ${point.y}px)`;
    }
  };

  // Points the popup at the marker currently drawn for the selected location.
  // Fanned-out markers sit off their true point and markers are rebuilt on
  // cluster changes, so this reads the live marker rather than location.lat/lng.
  // Returns false when that marker isn't on the map.
  const syncPopupAnchor = (map: HMap) => {
    const location = selectedRef.current;
    const marker = location
      ? map.getObjects().find((o) => isMarkerFor(o, location))
      : undefined;
    anchorGeoRef.current = marker ? marker.getGeometry() : null;
    positionPopup();
    return !!marker;
  };

  // Pans just enough that a freshly opened popup isn't clipped by the map edge
  // or hidden under the overlays reported by getPopupInsets.
  const panPopupIntoView = (map: HMap) => {
    const H = hRef.current;
    const box = popupBoxRef.current;
    const container = mapRef.current;
    const geo = anchorGeoRef.current;
    if (!H || !box || !container || !geo) return;
    const point = map.geoToScreen(geo);
    if (!point) return;

    const insets = getPopupInsetsRef.current?.() ?? {};
    const width = container.clientWidth;
    const height = container.clientHeight;
    // offsetWidth/Height ignore the pop-in scale transform, so this is the
    // popup's settled size even mid-animation.
    const top = point.y - POPUP_GAP - box.offsetHeight;
    const left = point.x - box.offsetWidth / 2;
    const right = point.x + box.offsetWidth / 2;
    const minTop = (insets.top ?? 0) + POPUP_MARGIN;
    const minLeft = (insets.left ?? 0) + POPUP_MARGIN;
    const maxRight = width - (insets.right ?? 0) - POPUP_MARGIN;

    // Shifting the view center by (dx, dy) moves the popup by (-dx, -dy).
    let dx = 0;
    let dy = 0;
    if (left < minLeft) dx = left - minLeft;
    else if (right > maxRight) dx = right - maxRight;
    if (top < minTop) dy = top - minTop;
    if (!dx && !dy) return;

    const center = map.screenToGeo(width / 2 + dx, height / 2 + dy);
    if (!center) return;
    map.getViewModel().setLookAtData(
      { position: center },
      true,
      { duration: 300, ease: H.util.animation.ease.EASE_OUT }
    );
  };

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
  const createUserMarker = (H: HNamespace, lat: number, lng: number) => {
    const svgMarkup = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="18" fill="#4285F4" fill-opacity="0.18"/><circle cx="20" cy="20" r="7.75" fill="#4285F4" stroke="white" stroke-width="2.5"/></svg>`;
    const icon = new H.map.Icon(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
      { size: { w: 40, h: 40 }, anchor: { x: 20, y: 20 } }
    );
    // High z-index keeps the dot above business/cluster markers.
    return new H.map.Marker({ lat, lng }, { icon, zIndex: 1000 });
  };

  // Cluster bubble: solid brand disc with a white ring, soft outer halo and
  // drop shadow. Sized by count tier so even the smallest reads larger than
  // the 40px business markers.
  const createClusterMarker = (
    H: HNamespace,
    lat: number,
    lng: number,
    count: number
  ) => {
    const r = count < 10 ? 18 : count < 50 ? 20 : count < 100 ? 22 : 25;
    const halo = r + 6;
    const size = (halo + 3) * 2;
    const c = size / 2;
    const label = count > 999 ? "999+" : String(count);
    const fontSize = label.length > 2 ? 12 : 14;
    const svgMarkup = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.5"/></filter></defs><circle cx="${c}" cy="${c}" r="${halo}" fill="${PRIMARY}" fill-opacity="0.25"/><circle cx="${c}" cy="${c + 1.5}" r="${r}" fill="black" fill-opacity="0.25" filter="url(#s)"/><circle cx="${c}" cy="${c}" r="${r}" fill="${PRIMARY}" stroke="white" stroke-width="2.5"/><text x="${c}" y="${c}" dy="0.35em" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="${fontSize}" font-weight="700" fill="white">${label}</text></svg>`;
    const icon = new H.map.Icon(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
      { size: { w: size, h: size }, anchor: { x: c, y: c } }
    );
    // Above business markers (default z 0), bigger clusters over smaller
    // ones, and below the user's location dot (z 1000).
    return new H.map.Marker(
      { lat, lng },
      { icon, zIndex: 100 + Math.min(count, 899) }
    );
  };

  // Builds a single business marker (off-map). Returns null if the location
  // has no color mapping. Does NOT add anything to the map.
  const buildMarker = async (
    H: HNamespace,
    location: MapLocation,
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
    marker.addEventListener("tap", (evt) => {
      onMarkerTapRef.current(evt.target.getData<MapLocation>());
    });
    return marker;
  };

  // Builds fanned-out markers for locations that share the exact same point,
  // plus a small center dot. Returns the array of objects (off-map).
  const buildOffsetMarkers = async (H: HNamespace, locations: MapLocation[]) => {
    // Markers sit on a ring around the shared point. A fixed radius packs
    // neighbours tighter as the group grows, so scale it with the count:
    // keep roughly one marker-width of arc between adjacent pins.
    const offsetDistance = Math.max(
      0.0002,
      (0.00014 * locations.length) / (2 * Math.PI)
    );

    const built = await Promise.all(
      locations.map((location, i) => {
        const angle = (i / locations.length) * 2 * Math.PI;
        const offsetLat = location.lat + offsetDistance * Math.cos(angle);
        const offsetLng = location.lng + offsetDistance * Math.sin(angle);
        return buildMarker(H, location, offsetLat, offsetLng);
      })
    );

    const objects: HMapObject[] = built.filter(
      (m): m is HMapObject => m !== null
    );

    const dotSvg = `<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="3.25" fill="white" stroke="#ccc" stroke-width="1.25"/></svg>`;
    const dotIcon = new H.map.Icon(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dotSvg)}`,
      { size: { w: 8, h: 8 }, anchor: { x: 4, y: 4 } }
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
  const buildClusterObjects = async (
    H: HNamespace,
    map: HMap,
    locations: MapLocation[]
  ) => {
    const gridSize = 0.05;
    const clusters: Record<
      string,
      { lats: number[]; lngs: number[]; count: number; locations: MapLocation[] }
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

    const objects: HMapObject[] = [];

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
    H: HNamespace,
    map: HMap,
    locations: MapLocation[],
    zoom: number,
    gen: number
  ) => {
    let objects: HMapObject[] = [];

    if (locations.length) {
      if (zoom < CLUSTER_ZOOM_THRESHOLD) {
        objects = await buildClusterObjects(H, map, locations);
      } else {
        const grouped: Record<string, MapLocation[]> = {};
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

    // Re-point an open popup at the rebuilt marker. If its marker is gone
    // (folded into a cluster), close the popup rather than leave it floating.
    if (selectedRef.current && !syncPopupAnchor(map)) {
      onPopupCloseRef.current?.();
    }
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

        const H = window.H;
        if (!H || !H.mapevents) {
          console.error("HERE Maps not available");
          return;
        }

        const baseLayer = createBasemapLayer(H);

        const container = mapRef.current;
        if (!container) return;

        const map = new H.Map(container, baseLayer, {
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
          positionPopup();
        });

        // Fires on every frame of a pan/zoom, so an open popup tracks its
        // marker smoothly instead of jumping at the end of the gesture.
        map.addEventListener("mapviewchange", positionPopup);

        // The popup has no close button: a tap on empty map dismisses it.
        // Marker taps land on the marker, not the map, and switch the popup.
        map.addEventListener("tap", (evt) => {
          if (evt.target === map && selectedRef.current) {
            onPopupCloseRef.current?.();
          }
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
          await renderMarkers(H, map, locationsRef.current, zoom, gen);
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
    // Map initialization must run exactly once. Including the fetch/render
    // closures or filter props here would tear down and rebuild the map on
    // every change; the dedicated effect below handles re-fetching instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch markers whenever search, category, or filters change. Keyed only
  // on those inputs on purpose: fetchLocations is recreated every render, so
  // depending on it would re-fetch in a loop.
  useEffect(() => {
    fetchLocations(searchQuery, categoryFilter, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, categoryFilter, filters]);

  // Open / move / close the popup when the selection changes. A layout effect
  // so the anchor is positioned before the browser paints the new popup;
  // otherwise it would flash at the map's top-left corner for a frame.
  useLayoutEffect(() => {
    selectedRef.current = selected;
    const map = mapInstance.current;
    if (!map || !selected) {
      anchorGeoRef.current = null;
      return;
    }
    if (syncPopupAnchor(map)) {
      panPopupIntoView(map);
    } else {
      onPopupCloseRef.current?.();
    }
    // Keyed on the selection only: the helpers read everything else from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

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

      {/* Popup bubble. The zero-size anchor is moved to the marker's point by
          positionPopup; the bubble hangs above it with its tail tip just over
          the marker. zIndex 40 lets it slide under the page's search/filter
          overlays (50+) when the map is dragged. */}
      {selected && renderPopup && (
        <div
          ref={popupAnchorRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            zIndex: 40,
          }}
        >
          <div
            ref={popupBoxRef}
            style={{
              position: "absolute",
              bottom: `${POPUP_GAP}px`,
              left: 0,
              // max-content: a zero-width anchor would otherwise squeeze the
              // bubble down to its narrowest word.
              width: "max-content",
              transform: "translateX(-50%)",
            }}
          >
            {/* Keyed per marker so switching markers replays the pop. Scales
                from the tail tip, so it grows out of the marker itself. */}
            <motion.div
              key={`${selected.id}:${selected.lat},${selected.lng}`}
              initial={
                reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.2 }
              }
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                scale: { type: "spring", stiffness: 520, damping: 28, mass: 0.7 },
                opacity: { duration: 0.12 },
              }}
              style={{
                transformOrigin: "50% 100%",
                // drop-shadow (not box-shadow) so the tail is shadowed too.
                filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.18))",
              }}
            >
              <div style={{ background: "white", borderRadius: "12px" }}>
                {renderPopup(selected)}
              </div>
              <div
                aria-hidden
                style={{
                  width: 0,
                  height: 0,
                  margin: "0 auto",
                  borderLeft: "9px solid transparent",
                  borderRight: "9px solid transparent",
                  borderTop: "10px solid white",
                }}
              />
            </motion.div>
          </div>
        </div>
      )}

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
