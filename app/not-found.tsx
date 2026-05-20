import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Still in the works</h1>
      <p className="mt-4 text-base text-gray-600">
        This is still in the works! You are seeing a sneak peak to VendorMaps. At the moment,
        you can view the map and add a business.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          View the Map
        </Link>
        <Link
          href="/add-business"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Add a Business
        </Link>
      </div>
    </main>
  );
}
