import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { US_STATES } from "@/lib/types/resource";

// GET — fetch business data for owner
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await sql`
      SELECT
        b.*,
        l.id as location_id,
        l.street_1,
        l.street_2,
        l.street_address,
        l.city,
        l.state,
        l.state_code,
        l.zip,
        l.show_exact_address,
        l.exact_address,
        l.neighborhood
      FROM businesses b
      LEFT JOIN locations l
        ON l.business_id = b.id
      WHERE b.id = ${id}
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Business not found or unauthorized" },
        { status: 404 }
      );
    }

    const business = result[0];

    return NextResponse.json({
      business,
      location: business,
    });

  } catch (error) {
    console.error("Owner GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch business" },
      { status: 500 }
    );
  }
}

// PATCH — update business location settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify ownership
    const owned = await sql`
      SELECT id FROM businesses
      WHERE id = ${id}
      AND claimed_by = ${session.user.id}
      AND claim_status = 'claimed'
    `;

    if (!owned || owned.length === 0) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const {
      showExactAddress,
      exactAddress,
      exactCity,
      exactStateCode,
      exactZip,
    } = await req.json();

    // The form sends the 2-letter code; locations stores both that and the
    // full name (the public listing renders state_code, the address string
    // uses the code too). Resolve one from the other so they cannot drift.
    const matchedState = US_STATES.find(
      (s) => s.code === exactStateCode
    );
    const exactState = matchedState?.name || null;

    // Build full exact address string. Stored whenever the owner has typed
    // one, independent of the toggle — show_exact_address alone controls
    // whether it is public. Keeping it means toggling back on is one tap
    // rather than retyping the address from scratch.
    const fullExactAddress =
      exactAddress
        ? [
            exactAddress,
            exactCity,
            exactStateCode,
            exactZip,
          ]
            .filter(Boolean)
            .join(", ")
        : null;

    // Publishing an exact address also puts the business on the map. Vendors
    // without a fixed location (home based, street based) have no coordinates
    // — and often no locations row at all — so geocode the address the owner
    // just gave us and place the pin from it.
    let coords: { lat: number; lng: number } | null = null;

    if (showExactAddress && fullExactAddress) {
      try {
        const geoRes = await fetch(
          "https://geocode.search.hereapi.com/v1/geocode" +
          `?q=${encodeURIComponent(fullExactAddress)}` +
          `&in=countryCode:USA&limit=1` +
          `&apiKey=${process.env.HERE_API_KEY}`
        );
        const geoData = await geoRes.json();
        const position = geoData.items?.[0]?.position;

        if (position?.lat && position?.lng) {
          coords = { lat: position.lat, lng: position.lng };
        }
      } catch (error) {
        // A failed geocode must not block saving the address itself; the
        // listing keeps its existing pin (or stays directory-only).
        console.error("Owner exact-address geocode error:", error);
      }
    }

    // Directory-only businesses were never given a locations row at submit,
    // so an UPDATE alone would silently match zero rows. Upsert instead.
    const existing = await sql`
      SELECT id, pin_from_exact_address
      FROM locations WHERE business_id = ${id}
    `;

    if (existing.length === 0) {
      await sql`
        INSERT INTO locations (
          business_id,
          street_address,
          city,
          state,
          state_code,
          zip,
          country,
          show_exact_address,
          exact_address,
          coordinates,
          pin_from_exact_address,
          is_active_area
        ) VALUES (
          ${id},
          ${exactAddress || null},
          ${exactCity || null},
          ${exactState},
          ${exactStateCode || null},
          ${exactZip || null},
          'USA',
          ${showExactAddress || false},
          ${fullExactAddress},
          ${coords
            ? sql`ST_MakePoint(${coords.lng}, ${coords.lat})`
            : sql`NULL`},
          ${coords !== null},
          true
        )
      `;
    } else {
      // Turning the toggle off retracts the pin that the exact address put on
      // the map — hiding the address but leaving the marker on the owner's
      // home would defeat the point. Only businesses whose pin came from this
      // toggle are affected: a listing with real cross streets keeps the
      // coordinates it was submitted with.
      const retractPin =
        !showExactAddress && existing[0].pin_from_exact_address;

      await sql`
        UPDATE locations SET
          show_exact_address = ${showExactAddress || false},
          exact_address      = ${fullExactAddress},
          street_address     = ${exactAddress
            ? exactAddress
            : sql`street_address`},
          city               = ${exactCity
            ? exactCity
            : sql`city`},
          state              = ${exactState
            ? exactState
            : sql`state`},
          state_code         = ${exactStateCode
            ? exactStateCode
            : sql`state_code`},
          zip                = ${exactZip
            ? exactZip
            : sql`zip`},
          coordinates        = ${coords
            ? sql`ST_MakePoint(${coords.lng}, ${coords.lat})`
            : retractPin
            ? sql`NULL`
            : sql`coordinates`},
          pin_from_exact_address = ${
            coords ? true : retractPin ? false : sql`pin_from_exact_address`
          },
          updated_at         = NOW()
        WHERE business_id = ${id}
      `;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Owner PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}