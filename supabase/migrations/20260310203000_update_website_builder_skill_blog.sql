-- Extend website-builder skill with optional blog generation flow.

UPDATE agent_skills
SET
  markdown_content = markdown_content || E'\n\n## Blog Generation (Optional)\n\nAfter creating website pages, ask if the user wants initial blog posts.\nIf yes, generate 3-5 posts using `create_blog_post`.\nPosts should follow the website theme, topic, and target audience.\n',
  updated_at = NOW()
WHERE agent_key = 'vibey'
  AND skill_key = 'website-builder'
  AND markdown_content NOT ILIKE '%## Blog Generation (Optional)%';
