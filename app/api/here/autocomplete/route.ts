import { NextRequest, NextResponse } from "next/server";

// Subset of a HERE Autocomplete API result item that we surface.
interface HereAutocompleteItem {
  id: string;
  title: string;
  address?: { label?: string };
}

export async function GET(req: NextRequest) {
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