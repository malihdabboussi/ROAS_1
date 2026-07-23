-- The ROAS owner's auth identity already uses dylan@dylanvanas.com, while the
-- public profile retained the original test email. Synchronize only that
-- existing user; organization ownership and membership remain unchanged.

UPDATE public.profiles AS profile
SET
  email = auth_user.email,
  updated_at = now()
FROM auth.users AS auth_user
WHERE profile.id = '5f2b4597-31c2-4169-aa4e-3ef31523555c'::uuid
  AND auth_user.id = profile.id
  AND lower(profile.email) = 'test@gmail.com'
  AND lower(auth_user.email) = 'dylan@dylanvanas.com';
