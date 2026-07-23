-- Slack and web image attachments are persisted as image_upload so they can be
-- retrieved separately from text documents in later conversation turns.

alter table public.conversation_documents
  drop constraint if exists conversation_documents_document_type_check;

alter table public.conversation_documents
  add constraint conversation_documents_document_type_check
  check (
    document_type = any (
      array[
        'offer',
        'avatar',
        'funnel',
        'lead_magnet',
        'sequence',
        'email',
        'upload',
        'image_upload',
        'content-plan'
      ]::text[]
    )
  );
