-- Tabela para planilhas personalizadas (criar minha planilha)
-- Cada usuário vê apenas as próprias planilhas (RLS).

CREATE TABLE IF NOT EXISTS public.custom_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para listar por usuário
CREATE INDEX IF NOT EXISTS idx_custom_sheets_user_id ON public.custom_sheets (user_id);
CREATE INDEX IF NOT EXISTS idx_custom_sheets_created_at ON public.custom_sheets (created_at DESC);

-- RLS: usuário só acessa suas próprias linhas
ALTER TABLE public.custom_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê apenas suas planilhas personalizadas"
  ON public.custom_sheets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.custom_sheets IS 'Planilhas personalizadas criadas pelo usuário (Criar minha planilha).';
