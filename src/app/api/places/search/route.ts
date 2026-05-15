import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const PLACE_SELECT =
  "id,name,slug,city,description,address,district,category,tags,latitude,longitude,google_map_url,thumbnail,tips,is_published,is_featured,submission_status,submitted_by,last_verified_at,created_at,updated_at";

type SearchMode = "fts-prefix" | "ilike";

function toInt(input: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(input ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function sanitizeFilterText(input: string) {
  return input
    .replace(/[,%]/g, " ")
    .replace(/[\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPrefixTsQuery(input: string) {
  const terms = sanitizeFilterText(input)
    .split(" ")
    .map((term) => term.replace(/[':!*&|()<>]/g, "").trim())
    .filter(Boolean);

  if (terms.length === 0) return "";
  return terms.map((term) => `${term}:*`).join(" & ");
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const params = req.nextUrl.searchParams;
  const q = (params.get("q") || "").trim();
  const city = (params.get("city") || "all").trim();
  const category = (params.get("category") || "all").trim();
  const safeCity = sanitizeFilterText(city);
  const safeKeyword = sanitizeFilterText(q);
  const prefixTsQuery = buildPrefixTsQuery(q);
  const limit = toInt(params.get("limit"), 60, 1, 200);
  const offset = toInt(params.get("offset"), 0, 0, 50_000);

  const runQuery = async (mode: SearchMode, useCityColumn: boolean) => {
    const select = useCityColumn ? PLACE_SELECT : PLACE_SELECT.replace("city,", "");
    let query = supabase
      .from("places")
      .select(select)
      .eq("is_published", true);

    if (useCityColumn && city !== "all") query = query.eq("city", city);
    if (category !== "all") query = query.eq("category", category);
    if (city !== "all" && safeCity) {
      const cityFilters = [
        useCityColumn ? `city.eq.${safeCity}` : null,
        `address.ilike.%${safeCity}%`,
        `district.ilike.%${safeCity}%`,
      ]
        .filter(Boolean)
        .join(",");
      if (cityFilters) query = query.or(cityFilters);
    }

    if (q) {
      if (mode === "fts-prefix" && prefixTsQuery) {
        query = query.filter("search_document", "fts", prefixTsQuery);
      } else {
        query = query.or(
          `name.ilike.%${safeKeyword}%,description.ilike.%${safeKeyword}%,address.ilike.%${safeKeyword}%,district.ilike.%${safeKeyword}%`
        );
      }
    }

    return query
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);
  };

  let { data, error } = await runQuery("fts-prefix", true);
  if (error?.message?.includes("search_document")) {
    const fallback = await runQuery("ilike", true);
    data = fallback.data;
    error = fallback.error;
  } else if (!error && q && (data?.length ?? 0) === 0) {
    // Prefix FTS misses are retried with ILIKE so partial text (e.g. 아시아 -> 아시아티크) always appears.
    const fallback = await runQuery("ilike", true);
    data = fallback.data;
    error = fallback.error;
  }
  if (error?.message?.includes("column places.city does not exist")) {
    const fallback = await runQuery("ilike", false);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const places = hasMore ? rows.slice(0, limit) : rows;

  return NextResponse.json({
    places,
    page: {
      limit,
      offset,
      total: offset + places.length + (hasMore ? 1 : 0),
      has_more: hasMore,
    },
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
