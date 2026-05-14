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

function sample(list, count) {
  const copy = [...list];
  const out = [];
  while (copy.length > 0 && out.length < count) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function toCity(value) {
  const city = String(value ?? "").trim();
  if (!city) return "Bangkok";
  const lower = city.toLowerCase();
  if (lower.includes("bangkok")) return "Bangkok";
  if (lower.includes("pattaya")) return "Pattaya";
  if (lower.includes("phuket")) return "Phuket";
  if (lower.includes("chiang")) return "Chiang Mai";
  if (lower.includes("hua")) return "Hua Hin";
  if (lower.includes("krabi")) return "Krabi";
  if (lower.includes("ayut")) return "Ayutthaya";
  return city;
}

function randomRating() {
  const n = Math.random();
  if (n < 0.05) return 2;
  if (n < 0.2) return 3;
  if (n < 0.55) return 4;
  return 5;
}

const REVIEW_COMMENTS = [
  "동선이 깔끔하고 처음 방문자도 찾기 쉬웠어요.",
  "직접 가보니 분위기와 서비스가 기대 이상이었습니다.",
  "가격 대비 만족도가 높은 편이라 재방문 의사 있어요.",
  "사진보다 실제가 더 좋았고 접근성도 괜찮았습니다.",
  "주말 저녁은 대기 있을 수 있으니 시간 조절 추천해요.",
  "친구랑 방문했는데 이동 동선이 편하고 주변 코스 연결이 좋아요.",
  "혼자 가도 부담 없고 직원 응대가 친절한 편이었어요.",
  "비오는 날에도 실내 동선이 괜찮아서 이용하기 편했습니다.",
  "관광객 기준으로도 설명이 쉬워서 첫 태국 여행에 좋습니다.",
  "근처 다른 장소와 묶어서 가기 좋아서 하루 코스로 추천해요.",
];

loadDotEnv(path.resolve(process.cwd(), ".env.local"));

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(URL, KEY);

const [{ data: places, error: placesError }, { data: reviews, error: reviewsError }] = await Promise.all([
  supabase
    .from("places")
    .select("id,name,city,category,latitude,longitude,is_published,is_featured,created_at")
    .eq("is_published", true)
    .limit(5000),
  supabase.from("place_reviews").select("place_id,rating").limit(50000),
]);

if (placesError) {
  console.error("places load failed:", placesError.message);
  process.exit(1);
}
if (reviewsError) {
  if (String(reviewsError.message || "").includes("place_reviews")) {
    console.error("place_reviews table is missing. Run supabase/upgrade_community_reviews_and_routes.sql first.");
    process.exit(1);
  }
  console.error("reviews load failed:", reviewsError.message);
  process.exit(1);
}

const placeList = places ?? [];
if (placeList.length < 10) {
  console.error("Not enough published places.");
  process.exit(1);
}

const reviewCountMap = new Map();
for (const row of reviews ?? []) {
  const id = String(row.place_id);
  reviewCountMap.set(id, (reviewCountMap.get(id) ?? 0) + 1);
}

const top50 = [...placeList]
  .sort((a, b) => {
    const ca = reviewCountMap.get(String(a.id)) ?? 0;
    const cb = reviewCountMap.get(String(b.id)) ?? 0;
    if (cb !== ca) return cb - ca;
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })
  .slice(0, 50);

const clearSeedReviews = await supabase.from("place_reviews").delete().ilike("nickname", "TG Seed %");
if (clearSeedReviews.error) {
  console.error("seed review cleanup failed:", clearSeedReviews.error.message);
  process.exit(1);
}

const reviewRows = [];
for (const place of top50) {
  const count = Math.floor(Math.random() * 14) + 2; // 2~15
  for (let i = 0; i < count; i += 1) {
    reviewRows.push({
      place_id: place.id,
      nickname: `TG Seed ${i + 1}`,
      rating: randomRating(),
      comment: pick(REVIEW_COMMENTS),
      created_at: new Date(Date.now() - Math.floor(Math.random() * 90) * 86_400_000).toISOString(),
    });
  }
}

for (let i = 0; i < reviewRows.length; i += 400) {
  const batch = reviewRows.slice(i, i + 400);
  const res = await supabase.from("place_reviews").insert(batch);
  if (res.error) {
    console.error("seed reviews insert failed:", res.error.message);
    process.exit(1);
  }
}

const clearSeedPlans = await supabase.from("trip_plans").delete().eq("submitted_by", "TG Seed Bot");
if (clearSeedPlans.error) {
  console.error("seed plan cleanup failed:", clearSeedPlans.error.message);
  process.exit(1);
}

const withCoord = placeList.filter(
  (p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))
);
const byCity = new Map();
for (const place of withCoord) {
  const city = toCity(place.city);
  if (!byCity.has(city)) byCity.set(city, []);
  byCity.get(city).push(place);
}
const cityNames = [...byCity.keys()].filter((name) => byCity.get(name).length >= 3);
if (cityNames.length === 0) cityNames.push("Bangkok");

const routeRows = [];
for (let i = 0; i < 20; i += 1) {
  const city = cityNames[i % cityNames.length];
  const source = byCity.get(city) ?? withCoord;
  const stopCount = Math.floor(Math.random() * 4) + 3; // 3~6
  const picks = sample(source, Math.min(stopCount, source.length));
  if (picks.length < 2) continue;
  const categoryMix = [...new Set(picks.map((p) => p.category || "General"))].slice(0, 2).join(" · ");
  routeRows.push({
    title: `${city} 추천 코스 ${String(i + 1).padStart(2, "0")}`,
    description: `${city}에서 이동하기 쉬운 장소를 묶은 커뮤니티 추천 코스입니다. (${categoryMix})`,
    extra_info: "대중교통 + 도보 기준으로 이동하면 편합니다.",
    submitted_by: "TG Seed Bot",
    status: "approved",
    place_ids: picks.map((p) => p.id),
    created_at: new Date(Date.now() - Math.floor(Math.random() * 45) * 86_400_000).toISOString(),
  });
}

const routeInsert = await supabase.from("trip_plans").insert(routeRows);
if (routeInsert.error) {
  console.error("seed routes insert failed:", routeInsert.error.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      reviewed_places: top50.length,
      inserted_reviews: reviewRows.length,
      inserted_routes: routeRows.length,
    },
    null,
    2
  )
);
