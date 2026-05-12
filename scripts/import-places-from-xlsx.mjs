import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const XLSX_PATH =
  process.env.XLSX_PATH ??
  "C:/Users/cowls/OneDrive/바탕 화면/Monkey/Monky_dev/서치태그/place.xlsx";
const PUBLISH = (process.env.PUBLISH ?? "true").toLowerCase() === "true";
const GEOCODE = (process.env.GEOCODE ?? "true").toLowerCase() === "true";
const SLEEP_MS = Number(process.env.SLEEP_MS ?? 1200);
const START_INDEX = Number(process.env.START_INDEX ?? 0);

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
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const cacheDir = path.resolve(process.cwd(), ".cache");
const cacheFile = path.join(cacheDir, "geocode-cache.json");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
const geocodeCache = fs.existsSync(cacheFile)
  ? JSON.parse(fs.readFileSync(cacheFile, "utf8"))
  : {};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(input) {
  const base = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base;
}

function inferDistrict(address = "") {
  const m = address.match(/(Sukhumvit|Asok|Thonglor|Ekkamai|Silom|Siam|Pratunam|Bang Rak|Sathon|Ratchada|Ari)/i);
  return m ? m[1] : "Bangkok";
}

function parseCategory(category = "") {
  const [main, sub] = String(category)
    .split(">")
    .map((v) => v.trim())
    .filter(Boolean);
  return { main: main || "General", sub: sub || "" };
}

async function geocodeAddress(address) {
  const key = String(address || "").trim();
  if (!key) return { lat: null, lng: null };
  if (geocodeCache[key]) return geocodeCache[key];
  if (!GEOCODE) return { lat: null, lng: null };

  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
    encodeURIComponent(`${key}, Bangkok, Thailand`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "bangkok-place-importer/1.0 (one-time import)",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) {
    geocodeCache[key] = { lat: null, lng: null };
    return geocodeCache[key];
  }

  const json = await res.json();
  const first = json?.[0];
  geocodeCache[key] = first
    ? { lat: Number(first.lat), lng: Number(first.lon) }
    : { lat: null, lng: null };
  await sleep(SLEEP_MS);
  return geocodeCache[key];
}

async function run() {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const prepared = [];
  const usedSlugs = new Set();

  for (let i = START_INDEX; i < rows.length; i += 1) {
    const row = rows[i];
    const nameKo = String(row.place_name_ko || "").trim();
    const nameEn = String(row.place_name_en || "").trim();
    const categoryRaw = String(row.category || "").trim();
    const address = String(row.address || "").trim();
    const displayName = nameEn || nameKo || `place-${i + 1}`;

    let slug = slugify(nameEn || nameKo || `place-${i + 1}`);
    if (!slug) slug = `place-${i + 1}`;
    let seq = 2;
    while (usedSlugs.has(slug)) {
      slug = `${slugify(nameEn || nameKo || `place-${i + 1}`)}-${seq++}`;
    }
    usedSlugs.add(slug);

    const { main, sub } = parseCategory(categoryRaw);
    const geo = await geocodeAddress(address);
    const district = inferDistrict(address);

    prepared.push({
      name: displayName,
      slug,
      description: nameKo && nameEn ? `${nameKo} / ${nameEn}` : nameKo || nameEn || null,
      address: address || null,
      district,
      category: main,
      tags: sub ? [sub] : [],
      latitude: geo.lat,
      longitude: geo.lng,
      google_map_url:
        geo.lat != null && geo.lng != null
          ? `https://maps.google.com/?q=${geo.lat},${geo.lng}`
          : null,
      tips: null,
      is_published: PUBLISH,
      is_featured: false,
      last_verified_at: new Date().toISOString(),
    });

    if ((i + 1) % 25 === 0) {
      console.log(`prepared ${i + 1}/${rows.length}`);
    }
  }

  fs.writeFileSync(cacheFile, JSON.stringify(geocodeCache, null, 2), "utf8");

  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < prepared.length; i += chunkSize) {
    const chunk = prepared.slice(i, i + chunkSize);
    const { error } = await supabase.from("places").upsert(chunk, { onConflict: "slug" });
    if (error) {
      console.error("upsert failed:", error.message);
      process.exit(1);
    }
    inserted += chunk.length;
    console.log(`upserted ${inserted}/${prepared.length}`);
  }

  const withCoords = prepared.filter((p) => p.latitude != null && p.longitude != null).length;
  console.log(`\nDone. total=${prepared.length}, withCoords=${withCoords}, publish=${PUBLISH}`);
}

run();
