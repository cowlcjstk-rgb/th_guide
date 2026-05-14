export type LabeledOption = {
  value: string;
  ko: string;
  en: string;
};

export const THAI_CITIES: LabeledOption[] = [
  { value: "Bangkok", ko: "방콕", en: "Bangkok" },
  { value: "Chiang Mai", ko: "치앙마이", en: "Chiang Mai" },
  { value: "Phuket", ko: "푸켓", en: "Phuket" },
  { value: "Pattaya", ko: "파타야", en: "Pattaya" },
  { value: "Krabi", ko: "끄라비", en: "Krabi" },
  { value: "Koh Samui", ko: "코사무이", en: "Koh Samui" },
  { value: "Hua Hin", ko: "후아힌", en: "Hua Hin" },
  { value: "Ayutthaya", ko: "아유타야", en: "Ayutthaya" },
];

export const PLACE_CATEGORIES: LabeledOption[] = [
  { value: "Cafe", ko: "카페", en: "Cafe" },
  { value: "Restaurant", ko: "로컬맛집", en: "Restaurant" },
  { value: "Rooftop", ko: "루프탑", en: "Rooftop" },
  { value: "Bar", ko: "바", en: "Bar" },
  { value: "Massage", ko: "마사지", en: "Massage" },
  { value: "Shopping", ko: "쇼핑", en: "Shopping" },
  { value: "Night Market", ko: "야시장", en: "Night Market" },
  { value: "Attraction", ko: "관광지", en: "Attraction" },
  { value: "Nightlife", ko: "밤문화", en: "Nightlife" },
];

export const NIGHTLIFE_SUB_CATEGORIES = ["마사지", "가라오케", "로컬업소", "여행상품"] as const;
export const NIGHTLIFE_CITIES = ["방콕", "파타야", "치앙마이"] as const;
