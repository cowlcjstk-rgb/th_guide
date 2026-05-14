import { Place } from "@/lib/types";

const DISTRICT_CITY_MAP: Record<string, string> = {
  "bang rak": "Bangkok",
  "pathum wan": "Bangkok",
  "sathorn": "Bangkok",
  "sukhumvit": "Bangkok",
  "thonglor": "Bangkok",
  "ekkamai": "Bangkok",
  "silom": "Bangkok",
  "ari": "Bangkok",
  "asok": "Bangkok",
  "siam": "Bangkok",
  "ratchada": "Bangkok",
  "chatuchak": "Bangkok",
  "phrom phong": "Bangkok",
  "srinakarin": "Bangkok",
  "riverside": "Bangkok",
  "old town": "Bangkok",
  "yaowarat": "Bangkok",
  "hua hin": "Hua Hin",
  "pattaya": "Pattaya",
  "chiang mai": "Chiang Mai",
  "phuket": "Phuket",
  "krabi": "Krabi",
  "samui": "Koh Samui",
  "ayutthaya": "Ayutthaya",
  "khao yai": "Nakhon Ratchasima",
};

const ADDRESS_CITY_RULES: Array<{ keyword: string; city: string }> = [
  { keyword: "bangkok", city: "Bangkok" },
  { keyword: "krung thep", city: "Bangkok" },
  { keyword: "chiang mai", city: "Chiang Mai" },
  { keyword: "pattaya", city: "Pattaya" },
  { keyword: "phuket", city: "Phuket" },
  { keyword: "krabi", city: "Krabi" },
  { keyword: "koh samui", city: "Koh Samui" },
  { keyword: "hua hin", city: "Hua Hin" },
  { keyword: "ayutthaya", city: "Ayutthaya" },
];

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function inferThaiCity(place: Pick<Place, "city" | "district" | "address">): string {
  if (place.city?.trim()) return place.city.trim();

  const district = normalize(place.district);
  if (district) {
    const direct = DISTRICT_CITY_MAP[district];
    if (direct) return direct;

    for (const [key, city] of Object.entries(DISTRICT_CITY_MAP)) {
      if (district.includes(key)) return city;
    }
  }

  const address = normalize(place.address);
  for (const rule of ADDRESS_CITY_RULES) {
    if (address.includes(rule.keyword)) return rule.city;
  }
  return "Other Thailand";
}

export function countBy<T>(rows: T[], picker: (row: T) => string): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = picker(row).trim() || "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

