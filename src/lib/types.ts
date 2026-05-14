export type Place = {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  description: string | null;
  address: string | null;
  district: string | null;
  category: string | null;
  tags: string[] | null;
  latitude: number | null;
  longitude: number | null;
  google_map_url: string | null;
  thumbnail: string | null;
  tips: string | null;
  is_published: boolean;
  is_featured: boolean;
  submission_status?: "pending" | "approved" | "rejected" | null;
  submitted_by?: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlaceReview = {
  id: string;
  place_id: string;
  nickname: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type TripPlan = {
  id: string;
  title: string | null;
  description?: string | null;
  extra_info?: string | null;
  submitted_by?: string | null;
  status?: "pending" | "approved" | "rejected" | null;
  place_ids: string[];
  created_at: string;
};

export type PlaceSubmissionImage = {
  id: string;
  place_id: string;
  image_url: string;
  moderation_status: "pending" | "approved" | "rejected";
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type CommunitySection =
  | "top-rated"
  | "latest-reviews"
  | "route-shares"
  | "guide"
  | "faq";

export type CommunityContent = {
  id: string;
  section: CommunitySection;
  title_ko: string;
  title_en: string;
  body_ko: string;
  body_en: string;
  sort_order: number;
  created_at: string;
};

export type Member = {
  id: string;
  login_id?: string | null;
  name: string;
  phone: string;
  email: string;
  kakao_id: string | null;
  line_id: string | null;
  telegram_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NightlifeSubCategory = "마사지" | "가라오케" | "로컬업소" | "여행상품";
export type NightlifeCity = "방콕" | "파타야" | "치앙마이";

export type TravelProduct = {
  id: string;
  title: string;
  summary: string | null;
  main_category: "밤문화";
  sub_category: NightlifeSubCategory;
  city: NightlifeCity;
  price_min: number | null;
  image_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
