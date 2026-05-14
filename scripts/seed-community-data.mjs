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

const KOR_NICKNAMES = [
  "여행토끼",
  "방콕러버",
  "푸켓가자",
  "카페탐험가",
  "야시장매니아",
  "길위의민지",
  "맛집헌터",
  "노을좋아",
  "치앙마이좋아",
  "태국한달살기",
];

const ENG_NICKNAMES = [
  "TravelMike",
  "LunaNomad",
  "MapleWander",
  "CityHopper",
  "RoadAndRice",
  "SkylineJade",
  "BackpackNate",
  "TropicalMia",
];

const ALNUM_NICKNAMES = [
  "jinny88",
  "roam23",
  "thaiwalker77",
  "mango_trip91",
  "sunset404",
  "eunseo_22",
  "guideboy55",
  "nina1004",
];

function randomNickname() {
  const bucket = Math.random();
  if (bucket < 0.34) return pick(KOR_NICKNAMES);
  if (bucket < 0.67) return pick(ENG_NICKNAMES);
  return pick(ALNUM_NICKNAMES);
}

function buildSeoReview(place) {
  const city = toCity(place.city);
  const category = place.category || "태국 여행";
  const templates = [
    `${city} 여행 일정에서 ${place.name} 방문했는데 위치가 좋아 동선 짜기 편했습니다. ${category} 찾는 분들께 추천합니다.`,
    `${place.name}는 실제로 가보니 후기보다 분위기가 더 좋았어요. ${city} 자유여행 코스로 넣기 좋고 재방문 의사 있습니다.`,
    `태국 ${city}에서 ${category} 찾는다면 ${place.name} 추천해요. 직원 응대가 괜찮고 주변 이동도 편해서 만족했습니다.`,
    `${place.name} 후기 보고 방문했는데 사진 스팟도 많고 만족도 높았습니다. ${city} 여행 초보도 찾기 쉬운 위치입니다.`,
    `${city} 여행 중 ${place.name} 들렀는데 대기 시간만 피하면 정말 괜찮아요. ${category} 기준으로 가성비 좋은 편입니다.`,
    `I visited ${place.name} during my ${city} trip. Great stop for ${category}, and the location is easy for first-time travelers.`,
    `${place.name} was one of the best picks on my Thailand itinerary. Clean place, friendly staff, and easy access in ${city}.`,
    `For anyone planning a ${city} travel route, ${place.name} is worth saving. Good vibe and convenient nearby transit.`,
  ];
  return pick(templates);
}

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
      nickname: randomNickname(),
      rating: randomRating(),
      comment: buildSeoReview(place),
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

const [clearSeedPlansByAuthor, clearSeedPlansByDesc] = await Promise.all([
  supabase.from("trip_plans").delete().eq("submitted_by", "TG Seed Bot"),
  supabase
    .from("trip_plans")
    .delete()
    .eq("description", "Bangkok/Thailand traveler-curated sample route for community launch."),
]);
if (clearSeedPlansByAuthor.error) {
  console.error("seed plan cleanup failed(author):", clearSeedPlansByAuthor.error.message);
  process.exit(1);
}
if (clearSeedPlansByDesc.error) {
  console.error("seed plan cleanup failed(desc):", clearSeedPlansByDesc.error.message);
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
  const author = randomNickname();
  routeRows.push({
    title: `${city} 실사용 추천 코스 ${String(i + 1).padStart(2, "0")}`,
    description: "Bangkok/Thailand traveler-curated sample route for community launch.",
    extra_info: "피크 시간대(18~21시) 피하면 이동이 훨씬 편합니다.",
    submitted_by: author,
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
