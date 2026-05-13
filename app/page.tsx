"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const HereMap = dynamic(
  () => import("@/components/map/HereMap"),
  { ssr: false }
);

export default function MapPage() {
  const [popup, setPopup] = useState<any>(null);

  return (
    <div
      style={{
        position: "fixed",
        top: "56px",
        bottom: "64px",
        left: 0,
        right: 0,
      }}
    >
      <HereMap onMarkerTap={setPopup} />

      {popup && (
        <div
          style={{
            position: "absolute" as const,
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            width: "280px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              fontFamily: "sans-serif",
              position: "relative" as const,
            }}
          >
            <button
              onClick={() => setPopup(null)}
              style={{
                position: "absolute" as const,
                top: "8px",
                right: "8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                color: "#999",
                lineHeight: 1,
              }}
            >
              ×
            </button>

            <p style={{
              fontSize: "14px",
              fontWeight: 600,
              margin: "0 0 4px",
              paddingRight: "24px",
              color: "#111",
            }}>
              {popup.name}
            </p>

            <p style={{
              fontSize: "12px",
              color: "#666",
              margin: "0 0 4px",
            }}>
              {popup.category || ""}
            </p>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}>
              <span style={{ fontSize: "12px", color: "#666" }}>
                {"$".repeat(popup.price_tier || 1)}
              </span>
              {popup.avg_rating > 0 && (
                <span style={{ fontSize: "12px", color: "#666" }}>
                  ★ {Number(popup.avg_rating).toFixed(1)}
                  ({popup.review_count})
                </span>
              )}
            </div>

            <p style={{
              fontSize: "12px",
              color: "#888",
              margin: "0 0 12px",
            }}>
              {popup.neighborhood || popup.city}
            </p>

            
            <a href={`/${popup.slug || popup.id}`}
              style={{
                display: "block",
                background: "#111",
                color: "white",
                textAlign: "center" as const,
                padding: "10px",
                borderRadius: "8px",
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              View Business
            </a>
          </div>
        </div>
      )}
    </div>
  );
}