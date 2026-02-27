
-- Fix 1: Replace overly permissive spreadsheets SELECT policy
-- Allow users to see their own spreadsheets, or admins/nutricionistas/gestores to see all
DROP POLICY IF EXISTS "Authenticated users can view spreadsheets" ON public.spreadsheets;

CREATE POLICY "Users can view own or role-based spreadsheets" ON public.spreadsheets
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'nutricionista')
    OR public.has_role(auth.uid(), 'gestor')
  );

-- Also fix the NCs SELECT policy (same pattern - currently allows all authenticated to see all NCs)
DROP POLICY IF EXISTS "Authenticated users can view NCs" ON public.non_conformities;

CREATE POLICY "Users can view own or role-based NCs" ON public.non_conformities
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'nutricionista')
    OR public.has_role(auth.uid(), 'gestor')
  );
