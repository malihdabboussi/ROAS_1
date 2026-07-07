ALTER TABLE conversation_documents DROP CONSTRAINT conversation_documents_document_type_check;

ALTER TABLE conversation_documents ADD CONSTRAINT conversation_documents_document_type_check CHECK (document_type = ANY (ARRAY['offer', 'avatar', 'funnel', 'lead_magnet', 'sequence', 'email', 'upload', 'content-plan']));;
