"use client";

import { useState } from "react";
import BusinessList from "@/app/directory/BusinessList";
import EventList from "@/app/directory/EventList";

export default function DirectoryPage() {
  const [activeTab, setActiveTab] = useState<"businesses" | "events">("businesses");

  return (
    <div className="min-h-screen bg-white">

      {/* Tab Header */}
      <div className="sticky top-14 bg-white border-b
        border-gray-100 z-10">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("businesses")}
              className={`py-4 text-sm font-medium
                border-b-2 transition
                ${activeTab === "businesses"
                  ? "border-black text-black"
                  : "border-transparent text-gray-400"
                }`}
            >
              Businesses
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`py-4 text-sm font-medium
                border-b-2 transition
                ${activeTab === "events"
                  ? "border-black text-black"
                  : "border-transparent text-gray-400"
                }`}
            >
              Events
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "businesses" && <BusinessList />}
      {activeTab === "events" && <EventList />}

    </div>
  );
}