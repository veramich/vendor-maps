import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ location: null });
  }

  try {
    const res = await fetch(
      `https://lookup.search.hereapi.com/v1/lookup?id=${encodeURIComponent(id)}&apiKey=${process.env.HERE_API_KEY}`
    );
    const data = await res.json();

    const location = {
      lat:           data.position?.lat || null,
      lng:           data.position?.lng || null,
      city:          data.address?.city || "",
      state:         data.address?.state || "",
      stateCode:     data.address?.stateCode || "",
      zip:           data.address?.postalCode || "",
      neighborhood:  data.address?.district || "",
      streetAddress: data.address?.label || "",
      street1:       data.address?.street || "",
      street2:       "",
    };

    return NextResponse.json({ location });

  } catch (error) {
    console.error("HERE Geocode error:", error);
    return NextResponse.json({ location: null });
  }
} 