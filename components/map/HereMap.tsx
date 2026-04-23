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

const loadCSS = (href: string): void => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
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
        console.log("Loading HERE Maps scripts...");

        loadCSS("https://js.api.here.com/v3/3.1/mapsjs-ui.css");

        // Load each script and wait before loading next
        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-core.js"
        );
        await wait(100);
        console.log("Core loaded");

        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-service.js"
        );
        await wait(100);
        console.log("Service loaded");

        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-ui.js"
        );
        await wait(100);
        console.log("UI loaded");

        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-mapevents.js"
        );
        await wait(300);
        console.log("MapEvents loaded");

        const H = (window as any).H;

        if (!H) {
          console.error("H not available after loading scripts");
          return;
        }

        if (!H.mapevents) {
          console.error("H.mapevents not available");
          return;
        }

        console.log("Initializing map...");

        const platform = new H.service.Platform({
          apikey: process.env.NEXT_PUBLIC_HERE_API_KEY,
        });

        const defaultLayers = platform.createDefaultLayers();

        const map = new H.Map(
          mapRef.current,
          defaultLayers.vector.normal.map,
          {
            zoom: 11,
            center: { lat: 34.0522, lng: -118.2437 },
          }
        );

        const mapEvents = new H.mapevents.MapEvents(map);
        new H.mapevents.Behavior(mapEvents);

        H.ui.UI.createDefault(map, defaultLayers);

        window.addEventListener("resize", () => {
          map.getViewPort().resize();
        });

        mapInstance.current = map;
        console.log("HERE Maps initialized successfully");

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
        background: "#f0f0f0",
      }}
    >
      <div
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "#666",
          fontSize: "14px",
          pointerEvents: "none",
        }}
      >
      </div>
    </div>
  );
}