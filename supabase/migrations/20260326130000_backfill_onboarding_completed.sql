UPDATE profiles
SET onboarding_completed = TRUE
WHERE fly_machine_id IS NOT NULL
  AND fly_machine_id <> '';
