"use client";

import { get } from "http";
import { useEffect, useRef } from "react";

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

const wait = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export default function HereMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  const addMarkers = async (H: any, map: any) => {
    try {
      const res = await fetch("/api/businesses/locations");
      const { locations } = await res.json();

      if (!locations || locations.length === 0) {
        console.log("No locations to display");
        return;
      }

      // Color by sub_type
      const getMarkerColor = (
        type: string,
        subType: string
      ): string | null => {
        
        // Shown on map
        if (subType === "street_vendor") return "#E63946";
        if (subType === "food_truck") return "#1B4FE4";
        if (subType === "home_based") return "#7B2D8B";
        if (subType === "pop_up") return "#FF006E"
        if (subType === "market") return "#2D6A4F";

        // Not Shown on map: 
        // shipping only, catering only, market_based, pop_up based
        return null;
      };

      locations.forEach((location: any) => {
        const color = getMarkerColor(
          location.type, 
          location.sub_type
        );

        if (!color) return;

        const svgMarkup = `
          <svg width="40" height="40" viewBox="0 0 40 40"
            xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="${color}" stroke="#fff" stroke-width="3"/>
          </svg>
        `;

        const icon = new H.map.Icon(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
          { size: { w: 40, h: 40 },
            anchor: { x: 20, y: 20 } 
          }
      );

        const marker = new H.map.Marker(
          { lat: location.lat, lng: location.lng },
          { icon }
        );

        marker.setData(location);

        marker.addEventListener("tap", (evt: any) => {
          const data = evt.target.getData();
          showPopup(H, map, data);
        });

        map.addObject(marker);

       console.log(`Added ${locations.length} markers`);
      });

      console.log(`Added ${locations.length} markers`);

    } catch (error) {
      console.error("Error adding markers:", error);
    }
  };

  const showPopup = (H: any, map: any, location: any) => {
    // Remove existing popups
    map.getObjects().forEach((obj: any) => {
      if (obj instanceof H.map.DomMarker) {
        map.removeObject(obj);
      }
    });

    const priceTier = "$".repeat(location.price_tier || 1);

    const popupEl = document.createElement("div");
    popupEl.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 12px;
        width: 200px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        font-family: sans-serif;
        position: relative;
      ">
        <button onclick="this.parentElement.parentElement.remove()" style="
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #999;
          line-height: 1;
        ">×</button>
        <p style="
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 4px;
          padding-right: 20px;
          color: #111;
        ">${location.name}</p>
        <p style="
          font-size: 11px;
          color: #666;
          margin: 0 0 4px;
        ">${location.category || ""}</p>
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        ">
          <span style="font-size: 11px; color: #666;">
            ${priceTier}
          </span>
          ${location.avg_rating > 0 ? `
            <span style="font-size: 11px; color: #666;">
              ★ ${Number(location.avg_rating).toFixed(1)}
              (${location.review_count})
            </span>
          ` : ""}
        </div>
        <p style="
          font-size: 11px;
          color: #888;
          margin: 0 0 10px;
        ">${location.neighborhood || location.city}</p>
        <a href="/businesses/${location.id}" style="
          display: block;
          background: #111;
          color: white;
          text-align: center;
          padding: 8px;
          border-radius: 8px;
          font-size: 12px;
          text-decoration: none;
        ">View Business</a>
      </div>
    `;

    const popup = new H.map.DomMarker(
      { lat: location.lat, lng: location.lng },
      {
        element: popupEl,
        anchor: { x: 100, y: 220 },
      }
    );

    map.addObject(popup);

    map.setCenter(
      { lat: location.lat, lng: location.lng },
      true
    );
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initMap = async () => {
      try {
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

        // Positron style
        const positronLayer = new H.map.layer.TileLayer(
          new H.map.provider.ImageTileProvider({
            getURL: (col: number, row: number, zoom: number) => {
              return `https://a.basemaps.cartocdn.com/light_all/${zoom}/${col}/${row}@2x.png`;
            },
            min: 0,
            max: 19,
            opacity: 1.0,
            tileSize: 512,
          })
        );

        // Initialize map
        const map = new H.Map(
          mapRef.current,
          positronLayer,
          {
            zoom: 11,
            center: { lat: 34.0522, lng: -118.2437 },
            pixelRatio: window.devicePixelRatio || 1,
          }
        );

        // Enable interaction
        const mapEvents = new H.mapevents.MapEvents(map);
        new H.mapevents.Behavior(mapEvents);

        // Handle resize
        window.addEventListener("resize", () => {
          map.getViewPort().resize();
        });

        mapInstance.current = map;

        // Add markers after map is ready
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