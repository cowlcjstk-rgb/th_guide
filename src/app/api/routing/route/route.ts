import { NextRequest, NextResponse } from "next/server";

type RouteMode = "driving" | "walking";

function normalizeMode(input: string | null): RouteMode {
  if (input === "walking") return "walking";
  return "driving";
}

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    mode?: RouteMode;
    points?: Array<{ lng: number; lat: number }>;
  };

  const mode = normalizeMode(body.mode ?? "driving");
  const points = Array.isArray(body.points) ? body.points : [];
  if (points.length < 2) {
    return NextResponse.json({ error: "At least 2 points required." }, { status: 400 });
  }

  const valid = points
    .map((p) => ({ lng: toNumber(p.lng), lat: toNumber(p.lat) }))
    .filter((p): p is { lng: number; lat: number } => p.lng != null && p.lat != null);

  if (valid.length < 2) {
    return NextResponse.json({ error: "Valid coordinates are required." }, { status: 400 });
  }

  const coords = valid.map((p) => `${p.lng},${p.lat}`).join(";");
  const profile = mode === "walking" ? "foot" : "driving";
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "thailand-guide/1.0 routing" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Routing provider error: ${res.status}` }, { status: 502 });
    }

    const data = (await res.json()) as {
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };

    const route = data.routes?.[0];
    const geometry = route?.geometry?.coordinates;
    if (!Array.isArray(geometry) || geometry.length < 2) {
      return NextResponse.json({ error: "No route found." }, { status: 404 });
    }

    return NextResponse.json({
      mode,
      distance_m: Number(route?.distance ?? 0),
      duration_s: Number(route?.duration ?? 0),
      coordinates: geometry,
    });
  } catch {
    return NextResponse.json({ error: "Routing request failed." }, { status: 502 });
  }
}
