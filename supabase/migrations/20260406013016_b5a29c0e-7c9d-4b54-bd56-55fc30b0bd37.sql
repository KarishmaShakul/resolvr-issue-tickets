-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets (priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets (category);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON public.ticket_attachments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_audit_trail_ticket_id ON public.ticket_audit_trail (ticket_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- Storage policies: drop existing and recreate
DROP POLICY IF EXISTS "Users can view their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

CREATE POLICY "Users can view their own attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Users can upload to their folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );