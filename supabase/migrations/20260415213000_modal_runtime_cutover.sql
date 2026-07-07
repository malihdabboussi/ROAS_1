UPDATE project_repos
SET runtime = 'modal'
WHERE runtime IS DISTINCT FROM 'modal';

ALTER TABLE project_repos
ALTER COLUMN runtime SET DEFAULT 'modal';
