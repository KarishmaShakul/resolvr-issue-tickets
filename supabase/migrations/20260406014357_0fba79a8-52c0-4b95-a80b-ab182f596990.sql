
-- Fix the generate_ticket_number function to only consider TKT- prefixed numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.tickets
  WHERE ticket_number ~ '^TKT-[0-9]+$';
  NEW.ticket_number := 'TKT-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

-- Fix the existing bad ticket number
UPDATE public.tickets 
SET ticket_number = 'TKT-0003' 
WHERE ticket_number LIKE 'TEMP-%';

-- Drop the duplicate trigger we accidentally created
DROP TRIGGER IF EXISTS generate_ticket_number_trigger ON public.tickets;
