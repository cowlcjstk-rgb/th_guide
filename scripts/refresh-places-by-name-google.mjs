import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickCountry(components = []) {
  return components.find((c) => (c.types || []).includes("country"))?.short_name ?? "";
}

loadDotEnv(path.resolve(process.cwd(), ".env.local"));

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SOFT_DELETE_NON_THAI = (process.env.SOFT_DELETE_NON_THAI ?? "true").toLowerCase() === "true";

if (!GOOGLE_KEY || !URL || !SERVICE_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY);

async function textSearch(query) {
  const url =
    "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" +
    encodeURIComponent(query) +
    "&language=en&region=th&key=" +
    encodeURIComponent(GOOGLE_KEY);
  const res = await fetch(url);
  const json = await res.json();
  return json;
}

async function placeDetails(placeId) {
  const fields = "place_id,name,formatted_address,geometry,url,address_component";
  const url =
    "https://maps.googleapis.com/maps/api/place/details/json?place_id=" +
    encodeURIComponent(placeId) +
    "&fields=" +
    encodeURIComponent(fields) +
    "&language=en&key=" +
    encodeURIComponent(GOOGLE_KEY);
  const res = await fetch(url);
  const json = await res.json();
  return json;
}

const { data, error } = await supabase
  .from("places")
  .select("id,name,address,district,category")
  .limit(10000);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = data ?? [];
let updated = 0;
let deleted = 0;
let unmatched = 0;
let failed = 0;

for (const row of rows) {
  try {
    const queries = [
      `${row.name}, ${row.district ?? ""}, Thailand`,
      `${row.name}, Bangkok, Thailand`,
      `${row.name}, Thailand`,
    ];

    let candidate = null;
    for (const q of queries) {
      const ts = await textSearch(q);
      if (ts?.status === "OK" && Array.isArray(ts.results) && ts.results.length > 0) {
        candidate = ts.results[0];
        break;
      }
      await sleep(60);
    }

    if (!candidate?.place_id) {
      unmatched += 1;
      continue;
    }

    const details = await placeDetails(candidate.place_id);
    if (details?.status !== "OK" || !details.result) {
      unmatched += 1;
      continue;
    }

    const r = details.result;
    const country = pickCountry(r.address_components ?? []);
    if (country !== "TH") {
      if (SOFT_DELETE_NON_THAI) {
        const { error: delErr } = await supabase.from("places").delete().eq("id", row.id);
        if (delErr) throw new Error(delErr.message);
        deleted += 1;
      } else {
        unmatched += 1;
      }
      continue;
    }

    const lat = r.geometry?.location?.lat ?? null;
    const lng = r.geometry?.location?.lng ?? null;
    const googleUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(r.place_id)}`;

    const { error: upErr } = await supabase
      .from("places")
      .update({
        address: r.formatted_address ?? row.address,
        latitude: lat,
        longitude: lng,
        google_map_url: googleUrl,
        last_verified_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (upErr) throw new Error(upErr.message);
    updated += 1;
    await sleep(80);
  } catch (e) {
    failed += 1;
    console.log(`failed id=${row.id} name=${row.name}: ${e.message}`);
  }
}

console.log({ total: rows.length, updated, deleted, unmatched, failed });
