export interface Supplier {
  code: string;
  name: string;
  pending: number;
  mapped: number;
  rejected: number;
  new: number;
  progress: number;
}

export interface Candidate {
  supplier: string;
  hotel_name: string;
  score: number;
  name_score: number;
  geo_score: number;
  address_score: number;
  distance: number;
  star_rating: number;
  chain_code: string | null;
  phone: string | null;
  images: string[];
  description: string | null;
}

export interface Hotel {
  id: string;
  hotel_name: string;
  address: string;
  city: string;
  country_code: string;
  star_rating: number;
  chain_code: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  final_score: number;
  decision_flags: string[];
  candidate_count: number;
  best_match: string;
  images: string[];
  description: string | null;
  amenities: string[];
  candidates: Candidate[];
}

export interface ReviewedHotel {
  id: string;
  hotel_name: string;
  city: string;
  country_code: string;
  status: "MAPPED" | "REJECTED" | "NEW";
  decision: string;
  mapped_to: string[];
  reviewed_at: string;
}

export type Decision = "MAPPED" | "REJECTED" | "MARK_NEW";
