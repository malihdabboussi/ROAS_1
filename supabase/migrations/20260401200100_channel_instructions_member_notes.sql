-- Append Member Identity and Member Notes sections to Slack and Telegram channel instruction files.
-- These teach the agent when and why to use save_member_note/get_member_notes actions.

UPDATE agent_definitions
SET content = content || E'\n\n## Member Identity\n\nThe CHANNEL_USER block in your context tells you who is messaging. Use their name naturally in your responses. If this person has prior notes from previous conversations, they''re included — use them to personalize without restating them verbatim.\n\n## Member Notes\n\nYou can save observations about the person you''re talking to using `save_member_note`. This builds a lightweight profile that persists across conversations — think of it as your personal memory of each person.\n\nSave a note when you learn something genuinely useful for future interactions:\n- Their role, responsibilities, or area of expertise\n- Communication preferences (brief vs detailed, technical vs plain)\n- Recurring topics or projects they work on\n- Preferences they''ve stated ("I prefer email campaigns over social")\n\nDo not save trivial greetings, one-off questions, or information already in their notes.\nDo not announce that you''re saving a note — just do it naturally in the background.\n',
    updated_at = now()
WHERE agent_key = 'vibey'
  AND file_name = 'channels/SLACK.md'
  AND user_id IS NULL
  AND content NOT LIKE '%Member Notes%';

UPDATE agent_definitions
SET content = content || E'\n\n## Member Identity\n\nThe CHANNEL_USER block in your context tells you who is messaging. Use their name naturally. If you have prior notes about this person, they''re included — reference what you know to personalize the conversation.\n\n## Member Notes\n\nYou can save observations about the person you''re talking to using `save_member_note`. This is especially valuable for public bots serving customers — each person who messages builds their own profile over time.\n\nSave a note when you learn something useful for future interactions:\n- What they''re working on or asking about repeatedly\n- Their business, industry, or role\n- Stated preferences or pain points\n- Key decisions or outcomes from past conversations\n\nDo not save trivial greetings, one-off questions, or duplicate information.\nDo not announce that you''re saving — just do it naturally in the background.\n',
    updated_at = now()
WHERE agent_key = 'vibey'
  AND file_name = 'channels/TELEGRAM.md'
  AND user_id IS NULL
  AND content NOT LIKE '%Member Notes%';
