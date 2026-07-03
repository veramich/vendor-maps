// Route-level loading fallback. Next.js shows this automatically while a
// server component in the segment is streaming/suspending. Matches the inline
// spinner used across the client pages (border ring, black top).
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div
        className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
