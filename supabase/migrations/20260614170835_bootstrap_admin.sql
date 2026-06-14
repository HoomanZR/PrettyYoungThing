/*
# Bootstrap first admin user

1. Changes
- Modify the handle_new_user trigger function to automatically assign 'admin' role to the very first user who signs up.
- Subsequent users get 'member' role.

2. Security
- No RLS changes. The trigger function runs as the database owner.

3. Important Notes
1. Only the very first user (when no profiles exist yet) gets admin role.
2. First user should sign up - they will automatically become admin.
3. Admin invite code enforcement is relaxed for the first user: the signup flow still requires an invite code, but the first admin can generate codes from the admin panel afterward.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
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
