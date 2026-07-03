import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// Subset of a HERE Autocomplete API result item that we surface.
interface HereAutocompleteItem {
  id: string;
  title: string;
  address?: { label?: string };
}

export async function GET(req: NextRequest) {
  // This route proxies the paid HERE key on every call and needs no login, so
  // cap it per IP to stop a script from running up the API bill. Autocomplete
  // fires on keystrokes, so the window is generous — real typing stays well
  // under it, but a scripted flood hits the ceiling fast.
  const limited = rateLimit(`here:autocomplete:${clientIp(req)}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { suggestions: [], error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );
  }

  const q = req.nextUrl.searchParams.get("q");

  if (!q) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const url = `https://autocomplete.search.hereapi.com/v1/autocomplete?q=${encodeURIComponent(q)}&in=countryCode:USA&limit=5&apiKey=${process.env.HERE_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    const suggestions =
      (data.items as HereAutocompleteItem[] | undefined)?.map((item) => ({
        id:      item.id,
        title:   item.title,
        address: item.address?.label || "",
      })) || [];

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error("HERE Autocomplete error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}