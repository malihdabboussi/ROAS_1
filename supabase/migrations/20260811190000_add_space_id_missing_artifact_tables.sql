-- blog_posts, emails, and conversation_documents were the only artifact tables
-- still missing space_id; their create paths already send it (scope defaults
-- inject space_id into every artifact action payload).
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.conversation_documents ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_space_id ON public.blog_posts(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_space_id ON public.emails(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_documents_space_id ON public.conversation_documents(space_id) WHERE space_id IS NOT NULL;
