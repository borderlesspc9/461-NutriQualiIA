ALTER TABLE public.non_conformities ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'discarded'));

-- Update existing resolved NCs to validated
UPDATE public.non_conformities SET validation_status = 'validated' WHERE resolved = true;
