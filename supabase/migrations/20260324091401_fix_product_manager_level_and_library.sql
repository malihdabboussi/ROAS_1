-- Fix product_manager template: Head of Product should be manager, not employee
UPDATE agent_employee_templates
SET level = 'manager', updated_at = now()
WHERE role_key = 'product_manager' AND level = 'employee';

-- Backfill existing agents_registry rows for Head of Product
UPDATE agents_registry
SET level = 'manager'
WHERE role = 'Head of Product' AND level = 'employee';

-- Remove auto-onboarded system agents from the hireable library.
-- brain_scholar and widget_builder are given at onboarding, not hired.
UPDATE agent_employee_templates
SET is_enabled = false, updated_at = now()
WHERE role_key IN ('brain_scholar', 'widget_builder');
