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

const KOR_NICKNAMES = [
  "여행토끼",
  "방콕러버",
  "푸켓가자",
  "카페탐험가",
  "야시장매니아",
  "길위의민지",
  "맛집헌터",
  "치앙마이좋아",
  "태국한달살기",
  "도시산책러",
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

const ROUTE_TITLE_PATTERNS = [
  "{city} 첫 방문자 반나절 코스",
  "{city} 실사용 이동 동선",
  "{city} 맛집+스팟 하루 코스",
  "{city} 저녁 중심 추천 루트",
  "{city} 검증 장소 묶음 코스",
  "{city} 도보+택시 혼합 코스",
];

const REVIEW_PATTERNS_KO = [
  "{city} 여행 일정에서 {place} 넣어봤는데 동선이 잘 맞았습니다. {category} 찾는 분들께 추천해요.",
  "{place} 실제 방문 후기입니다. 사진보다 분위기가 좋았고 초행자도 찾기 쉬운 위치였습니다.",
  "{city} 자유여행 중 들렀는데 대기만 피하면 만족도가 높은 편이었어요. 재방문 의사 있습니다.",
  "{place}는 주변 코스와 묶기 좋아서 일정 짜기 편했습니다. 접근성도 괜찮았어요.",
  "{category} 기준으로 무난하게 만족한 장소였습니다. {city} 일정에 넣어도 후회 없을 듯해요.",
];

const REVIEW_PATTERNS_EN = [
  "Visited {place} during my {city} trip. Great option for {category} and easy to fit into a one-day route.",
  "{place} felt better in person than online photos. Good access, friendly vibe, and worth saving for Thailand travel.",
  "If you are planning a {city} itinerary, {place} is a practical stop with stable quality and easy transit access.",
];

function randomNickname() {
  const bucket = Math.random();
  if (bucket < 0.34) return pick(KOR_NICKNAMES);
  if (bucket < 0.67) return pick(ENG_NICKNAMES);
  return pick(ALNUM_NICKNAMES);
}

function buildRouteTitle(city) {
  return pick(ROUTE_TITLE_PATTERNS).replace("{city}", city);
}

function buildRouteDescription(city, places) {
  const topNames = places.slice(0, 3).map((p) => p.name).join(", ");
  const one = `${city}에서 실제 이동 시간을 고려해 짠 코스입니다.`;
  const two = topNames
    ? `주요 경유지는 ${topNames}이며, 초행자도 따라가기 쉽게 구성했습니다.`
    : "첫 방문자도 따라가기 쉬운 순서로 구성했습니다.";
  return `${one} ${two}`;
}

function buildReviewComment(place) {
  const city = toCity(place?.city);
  const category = place?.category || "travel spots";
  const p = place?.name || "this place";
  const useKo = Math.random() < 0.68;
  const pattern = useKo ? pick(REVIEW_PATTERNS_KO) : pick(REVIEW_PATTERNS_EN);
  return pattern
    .replaceAll("{city}", city)
    .replaceAll("{place}", p)
    .replaceAll("{category}", category);
}

loadDotEnv(path.resolve(process.cwd(), ".env.local"));

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(URL, KEY);

const { data: places, error: placesError } = await supabase
  .from("places")
  .select("id,name,city,category")
  .eq("is_published", true)
  .limit(5000);
if (placesError) {
  console.error(placesError.message);
  process.exit(1);
}
const placeMap = new Map((places ?? []).map((p) => [String(p.id), p]));

const { data: routeRows, error: routeError } = await supabase
  .from("trip_plans")
  .select("id,title,description,submitted_by,place_ids,status")
  .eq("status", "approved")
  .or("description.eq.Bangkok/Thailand traveler-curated sample route for community launch.,title.ilike.%추천 코스%");

if (routeError) {
  console.error(routeError.message);
  process.exit(1);
}

let updatedRoutes = 0;
for (const route of routeRows ?? []) {
  const ids = Array.isArray(route.place_ids) ? route.place_ids.map(String) : [];
  const ps = ids.map((id) => placeMap.get(id)).filter(Boolean);
  const city = toCity(ps[0]?.city);
  const title = buildRouteTitle(city);
  const description = buildRouteDescription(city, ps);
  const extraInfo = "대중교통+택시 기준 이동 시간 반영. (seed-route-v2)";

  const { error } = await supabase
    .from("trip_plans")
    .update({
      title,
      description,
      submitted_by: randomNickname(),
      extra_info: extraInfo,
    })
    .eq("id", route.id);
  if (!error) updatedRoutes += 1;
}

const nicknameFilter = [...KOR_NICKNAMES, ...ENG_NICKNAMES, ...ALNUM_NICKNAMES];
const { data: reviewRows, error: reviewError } = await supabase
  .from("place_reviews")
  .select("id,place_id,nickname,comment,rating")
  .or(`nickname.ilike.TG Seed %,nickname.in.(${nicknameFilter.map((v) => `"${v}"`).join(",")})`)
  .limit(5000);

if (reviewError) {
  console.error(reviewError.message);
  process.exit(1);
}

let updatedReviews = 0;
for (const review of reviewRows ?? []) {
  const place = placeMap.get(String(review.place_id));
  const { error } = await supabase
    .from("place_reviews")
    .update({
      nickname: randomNickname(),
      comment: buildReviewComment(place),
    })
    .eq("id", review.id);
  if (!error) updatedReviews += 1;
}

console.log(
  JSON.stringify(
    {
      updated_routes: updatedRoutes,
      updated_reviews: updatedReviews,
    },
    null,
    2
  )
);

