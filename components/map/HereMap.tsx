"use client";

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

        // Positron style using getURL function
        const positronLayer = new H.map.layer.TileLayer(
          new H.map.provider.ImageTileProvider({
            getURL: (col: number, row: number, zoom: number) => {
              return `https://a.basemaps.cartocdn.com/light_all/${zoom}/${col}/${row}.png`;
            },
            min: 0,
            max: 19,
            opacity: 1.0,
          })
        );

        const map = new H.Map(
          mapRef.current,
          positronLayer,
          {
            zoom: 11,
            center: { lat: 34.0522, lng: -118.2437 },
          }
        );

        const mapEvents = new H.mapevents.MapEvents(map);
        new H.mapevents.Behavior(mapEvents);

        window.addEventListener("resize", () => {
          map.getViewPort().resize();
        });

        mapInstance.current = map;
        console.log("HERE Maps with Positron initialized");

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