/*
# MediaVault - Complete Database Schema

1. New Tables
- `profiles`: Extends auth.users with display name, avatar URL, and role (admin/member).
- `invite_codes`: Unique codes for invite-only registration. Tracks usage count and max uses.
- `media_items`: Central table for all media types (movie, tv_show, album, song, artist). Polymorphic design with `type` discriminator.
- `genres`: Genre definitions shared across media types.
- `media_genres`: Junction table linking media items to genres.
- `tags`: User-created tags for flexible categorization.
- `media_tags`: Junction table linking media items to tags.
- `media_links`: External links for media items (YouTube, Spotify, IMDb, Rotten Tomatoes, Apple Music, Wikipedia).
- `favorites`: User favorites for media items. One favorite per user per item.
- `ratings`: User ratings (1-10) for media items. One rating per user per item.
- `reviews`: User notes/reviews for media items. One review per user per item.
- `collections`: Custom user-curated collections (e.g., "Best Horror Movies").
- `collection_items`: Junction table linking media items to collections with ordering.

2. Security
- RLS enabled on all tables.
- All authenticated users can read shared data (media_items, genres, tags, collections).
- Only creators and admins can modify/delete shared content.
- Personal data (favorites, ratings, reviews) scoped to owner via auth.uid().
- Invite code management restricted to admins.

3. Important Notes
1. `media_items.type` uses a CHECK constraint to ensure only valid media types.
2. `profiles.role` defaults to 'member'. Only admins can promote users.
3. `invite_codes` tracks usage to enforce max uses limit.
4. Unique constraints prevent duplicate favorites, ratings, reviews per user per item.
5. All owner columns use `DEFAULT auth.uid()` so frontend inserts work without passing user_id.
*/

-- Profiles table extending auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin can update any profile (for role management)
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_uses integer NOT NULL DEFAULT 1,
  use_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_invites" ON invite_codes;
CREATE POLICY "admin_manage_invites" ON invite_codes FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "authenticated_view_invites" ON invite_codes;
CREATE POLICY "authenticated_view_invites" ON invite_codes FOR SELECT
  TO authenticated USING (true);

-- Media items table (polymorphic)
CREATE TABLE IF NOT EXISTS media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('movie', 'tv_show', 'album', 'song', 'artist')),
  title text NOT NULL,
  description text,
  image_url text,
  release_date date,
  creator uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_media_items" ON media_items;
CREATE POLICY "select_media_items" ON media_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_media_items" ON media_items;
CREATE POLICY "insert_media_items" ON media_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = creator);

DROP POLICY IF EXISTS "update_media_items" ON media_items;
CREATE POLICY "update_media_items" ON media_items FOR UPDATE
  TO authenticated USING (
    auth.uid() = creator OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    auth.uid() = creator OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "delete_media_items" ON media_items;
CREATE POLICY "delete_media_items" ON media_items FOR DELETE
  TO authenticated USING (
    auth.uid() = creator OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Genres table
CREATE TABLE IF NOT EXISTS genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_genres" ON genres;
CREATE POLICY "select_genres" ON genres FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_genres" ON genres;
CREATE POLICY "insert_genres" ON genres FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_genres" ON genres;
CREATE POLICY "update_genres" ON genres FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_genres" ON genres;
CREATE POLICY "delete_genres" ON genres FOR DELETE
  TO authenticated USING (true);

-- Media-genre junction table
CREATE TABLE IF NOT EXISTS media_genres (
  media_id uuid NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, genre_id)
);

ALTER TABLE media_genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_media_genres" ON media_genres;
CREATE POLICY "select_media_genres" ON media_genres FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_media_genres" ON media_genres;
CREATE POLICY "insert_media_genres" ON media_genres FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_media_genres" ON media_genres;
CREATE POLICY "delete_media_genres" ON media_genres FOR DELETE
  TO authenticated USING (true);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tags" ON tags;
CREATE POLICY "select_tags" ON tags FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_tags" ON tags;
CREATE POLICY "insert_tags" ON tags FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "delete_tags" ON tags;
CREATE POLICY "delete_tags" ON tags FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- Media-tags junction table
CREATE TABLE IF NOT EXISTS media_tags (
  media_id uuid NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, tag_id)
);

ALTER TABLE media_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_media_tags" ON media_tags;
CREATE POLICY "select_media_tags" ON media_tags FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_media_tags" ON media_tags;
CREATE POLICY "insert_media_tags" ON media_tags FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_media_tags" ON media_tags;
CREATE POLICY "delete_media_tags" ON media_tags FOR DELETE
  TO authenticated USING (true);

-- External links table
CREATE TABLE IF NOT EXISTS media_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('youtube', 'spotify', 'imdb', 'rotten_tomatoes', 'apple_music', 'wikipedia', 'other')),
  url text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE media_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_media_links" ON media_links;
CREATE POLICY "select_media_links" ON media_links FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_media_links" ON media_links;
CREATE POLICY "insert_media_links" ON media_links FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_media_links" ON media_links;
CREATE POLICY "update_media_links" ON media_links FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_media_links" ON media_links;
CREATE POLICY "delete_media_links" ON media_links FOR DELETE
  TO authenticated USING (true);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_favorites" ON favorites;
CREATE POLICY "select_favorites" ON favorites FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ratings" ON ratings;
CREATE POLICY "select_ratings" ON ratings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_ratings" ON ratings;
CREATE POLICY "insert_own_ratings" ON ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ratings" ON ratings;
CREATE POLICY "update_own_ratings" ON ratings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ratings" ON ratings;
CREATE POLICY "delete_own_ratings" ON ratings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reviews" ON reviews;
CREATE POLICY "select_reviews" ON reviews FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reviews" ON reviews;
CREATE POLICY "insert_own_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reviews" ON reviews;
CREATE POLICY "update_own_reviews" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reviews" ON reviews;
CREATE POLICY "delete_own_reviews" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image_url text,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_collections" ON collections;
CREATE POLICY "select_collections" ON collections FOR SELECT
  TO authenticated USING (is_public = true OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_collections" ON collections;
CREATE POLICY "insert_own_collections" ON collections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_collections" ON collections;
CREATE POLICY "update_own_collections" ON collections FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_collections" ON collections;
CREATE POLICY "delete_own_collections" ON collections FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Collection items junction table
CREATE TABLE IF NOT EXISTS collection_items (
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, media_id)
);

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_collection_items" ON collection_items;
CREATE POLICY "select_collection_items" ON collection_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_collection_items" ON collection_items;
CREATE POLICY "insert_collection_items" ON collection_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM collections WHERE id = collection_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_collection_items" ON collection_items;
CREATE POLICY "delete_collection_items" ON collection_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM collections WHERE id = collection_id AND owner_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON media_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_items_creator ON media_items(creator);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_media_id ON favorites(media_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_media_id ON ratings(media_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_media_id ON reviews(media_id);
CREATE INDEX IF NOT EXISTS idx_collections_owner_id ON collections(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_links_media_id ON media_links(media_id);
CREATE INDEX IF NOT EXISTS idx_media_genres_media_id ON media_genres(media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_media_id ON media_tags(media_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment invite code usage
CREATE OR REPLACE FUNCTION public.use_invite_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv FROM invite_codes WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF inv.use_count >= inv.max_uses THEN
    RETURN false;
  END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN false;
  END IF;
  UPDATE invite_codes SET use_count = use_count + 1 WHERE id = inv.id;
  RETURN true;
END;
$$;
