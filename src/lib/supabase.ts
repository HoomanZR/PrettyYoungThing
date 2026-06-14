import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MediaType = 'movie' | 'tv_show' | 'album' | 'song' | 'artist';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  description: string | null;
  image_url: string | null;
  release_date: string | null;
  creator: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  creator_profile?: Profile;
  genres?: Genre[];
  tags?: Tag[];
  links?: MediaLink[];
  user_favorite?: boolean;
  user_rating?: number;
  user_review?: string;
  avg_rating?: number;
}

export interface Genre {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
  created_by: string;
}

export interface MediaLink {
  id: string;
  media_id: string;
  platform: 'youtube' | 'spotify' | 'imdb' | 'rotten_tomatoes' | 'apple_music' | 'wikipedia' | 'other';
  url: string;
  label: string | null;
}

export interface Favorite {
  id: string;
  user_id: string;
  media_id: string;
  created_at: string;
}

export interface Rating {
  id: string;
  user_id: string;
  media_id: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  media_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_profile?: Profile;
}

export interface Collection {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  owner_profile?: Profile;
  items?: CollectionItem[];
  item_count?: number;
}

export interface CollectionItem {
  collection_id: string;
  media_id: string;
  sort_order: number;
  added_at: string;
  media_item?: MediaItem;
}

export interface InviteCode {
  id: string;
  code: string;
  created_by: string;
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  created_at: string;
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Movie',
  tv_show: 'TV Show',
  album: 'Album',
  song: 'Song',
  artist: 'Artist',
};

export const MEDIA_TYPE_ICONS: Record<MediaType, string> = {
  movie: 'Film',
  tv_show: 'Tv',
  album: 'Disc3',
  song: 'Music',
  artist: 'User',
};

export const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  imdb: 'IMDb',
  rotten_tomatoes: 'Rotten Tomatoes',
  apple_music: 'Apple Music',
  wikipedia: 'Wikipedia',
  other: 'Other',
};
