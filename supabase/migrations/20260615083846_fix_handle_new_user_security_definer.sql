-- Fix: handle_new_user() must be SECURITY DEFINER to run as postgres (table owner)
-- Without SECURITY DEFINER, the trigger runs as supabase_auth_admin which:
--   1. Lacks INSERT privilege on public.profiles
--   2. Does not bypass RLS (rolbypassrls = false)
-- This caused "Database error saving new user" on every signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_count integer;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE WHEN profile_count = 0 THEN 'admin' ELSE 'member' END
  );
  RETURN NEW;
END;
$$;