import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv(path.resolve(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MAPTILER_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_MAPTILER_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const SLEEP_MS = Number(process.env.SLEEP_MS ?? 400);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(query) {
  const url =
    `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json` +
    `?key=${MAPTILER_KEY}&limit=1&country=th`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const feature = json?.features?.[0];
  if (!feature?.center) return null;
  const [lng, lat] = feature.center;
  return { lat, lng };
}

async function run() {
  const { data, error } = await supabase
    .from("places")
    .select("id,name,address")
    .or("latitude.is.null,longitude.is.null")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const targets = data ?? [];
  console.log(`targets: ${targets.length}`);

  let updated = 0;
  for (let i = 0; i < targets.length; i += 1) {
    const row = targets[i];
    const q1 = `${row.name}, Bangkok, Thailand`;
    const q2 = row.address ? `${row.address}, Bangkok, Thailand` : "";
    const hit = (await geocode(q1)) ?? (q2 ? await geocode(q2) : null);
    if (hit) {
      const { error: upErr } = await supabase
        .from("places")
        .update({
          latitude: Number(hit.lat),
          longitude: Number(hit.lng),
          google_map_url: `https://maps.google.com/?q=${hit.lat},${hit.lng}`,
          last_verified_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (!upErr) updated += 1;
    }
    if ((i + 1) % 25 === 0) console.log(`processed ${i + 1}/${targets.length}`);
    await sleep(SLEEP_MS);
  }

  console.log(`done. updated=${updated}/${targets.length}`);
}

run();
