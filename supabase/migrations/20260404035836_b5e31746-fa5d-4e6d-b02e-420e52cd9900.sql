
-- Create ticket status and priority enums
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.ticket_category AS ENUM ('technical', 'network', 'hardware', 'software', 'access', 'hr', 'facilities', 'other');

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  category ticket_category NOT NULL DEFAULT 'other',
  tags TEXT[] DEFAULT '{}',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket comments table
CREATE TABLE public.ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket attachments table
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit trail table
CREATE TABLE public.ticket_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_number sequence function
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.tickets;
  NEW.ticket_number := 'TKT-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
  EXECUTE FUNCTION public.generate_ticket_number();

-- Updated_at trigger for tickets
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trail trigger for status changes
CREATE OR REPLACE FUNCTION public.log_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_audit_trail (ticket_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'status_changed', OLD.status::TEXT, NEW.status::TEXT);
  END IF;
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.ticket_audit_trail (ticket_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'assigned', NULL, NEW.assigned_to::TEXT);
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.ticket_audit_trail (ticket_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'priority_changed', OLD.priority::TEXT, NEW.priority::TEXT);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_ticket_changes
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_status_change();

-- Indexes
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);
CREATE INDEX idx_ticket_audit_trail_ticket_id ON public.ticket_audit_trail(ticket_id);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tickets
CREATE POLICY "Users can view their own tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create tickets" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any ticket" ON public.tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own open tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'open');

-- RLS Policies for comments
CREATE POLICY "Users can view comments on their tickets" ON public.ticket_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated users can add comments" ON public.ticket_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- RLS Policies for attachments
CREATE POLICY "Users can view attachments on their tickets" ON public.ticket_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can upload attachments to their tickets" ON public.ticket_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

CREATE POLICY "Admins can upload attachments" ON public.ticket_attachments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for audit trail
CREATE POLICY "Users can view audit trail of their tickets" ON public.ticket_audit_trail
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "System can insert audit entries" ON public.ticket_audit_trail
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;

-- Storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ticket-attachments', 'ticket-attachments', false, 10485760, 
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

-- Storage RLS policies
CREATE POLICY "Users can upload ticket attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Users can view their own attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Admins can view all attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments' AND public.has_role(auth.uid(), 'admin'));
