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

loadDotEnv(path.resolve(process.cwd(), ".env.local"));

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!GOOGLE_KEY || !URL || !SERVICE_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY);
const { data, error } = await supabase
  .from("places")
  .select("id,name,address,district,category")
  .limit(10000);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = data ?? [];
let kept = 0;
let deleted = 0;
let updated = 0;
let failed = 0;

for (const row of rows) {
  try {
    const query = [row.name, row.address, row.district, "Thailand"].filter(Boolean).join(", ");
    const apiUrl =
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
      encodeURIComponent(query) +
      "&language=en&region=th&key=" +
      encodeURIComponent(GOOGLE_KEY);

    const res = await fetch(apiUrl);
    const json = await res.json();
    const first = json?.results?.[0];
    const country = first?.address_components?.find((c) =>
      Array.isArray(c.types) ? c.types.includes("country") : false
    )?.short_name;

    if (json?.status !== "OK" || !first || country !== "TH") {
      const { error: delErr } = await supabase.from("places").delete().eq("id", row.id);
      if (delErr) throw new Error(delErr.message);
      deleted += 1;
      continue;
    }

    kept += 1;
    const lat = first.geometry?.location?.lat ?? null;
    const lng = first.geometry?.location?.lng ?? null;
    const placeId = first.place_id;
    const mapUrl = placeId
      ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

    const { error: upErr } = await supabase
      .from("places")
      .update({
        address: first.formatted_address ?? row.address,
        latitude: lat,
        longitude: lng,
        google_map_url: mapUrl,
        last_verified_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    updated += 1;
    await sleep(90);
  } catch (e) {
    failed += 1;
    console.log(`failed id=${row.id} name=${row.name}: ${e.message}`);
  }
}

console.log({ total: rows.length, kept, deleted, updated, failed });
