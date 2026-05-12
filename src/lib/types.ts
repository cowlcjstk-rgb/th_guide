export type Place = {
  id: string;
  name: string;
  slug: string;
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
  place_ids: string[];
  created_at: string;
};
