-- Run AFTER signing in once with eugene.vestel@gmail.com so the profile row exists.
-- Promotes that account to admin. Update the email if needed.
update public.profiles
set role = 'admin'
where email = 'eugene.vestel@gmail.com';
