import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");

  if (!q) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const url = `https://autocomplete.search.hereapi.com/v1/autocomplete?q=${encodeURIComponent(q)}&in=countryCode:USA&limit=5&apiKey=${process.env.HERE_API_KEY}`;

    console.log("HERE URL:", url);

    const res = await fetch(url);
    const data = await res.json();

    console.log("HERE Response:", JSON.stringify(data));

    const suggestions = data.items?.map((item: any) => ({
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