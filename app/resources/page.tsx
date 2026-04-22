import Link from "next/link";

export default function ResourcesPage() {
  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6 max-w-lg mx-auto">
        <h1 className="text-xl font-medium">Resources</h1>
        <Link
          href="/add-resource"
          className="flex items-center gap-2 bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Resource
        </Link>
      </div>

      {/* Resource listings will go here */}
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">No resources yet</p>
      </div>
    </div>
  );
}