# Planilhas personalizadas no Supabase

As planilhas criadas em **"Criar minha planilha"** são salvas na tabela `custom_sheets` do mesmo projeto Supabase do app.

## Criar a tabela

No **Supabase Dashboard** → **SQL Editor**, execute a migration:

`supabase/migrations/20260227100000_custom_sheets.sql`

Ou rode no seu projeto Supabase (via CLI):

```bash
supabase db push
```

Se a tabela não existir, o app usa **localStorage** como fallback (dados só no mesmo navegador/dispositivo).

## Estrutura

- `id` (uuid, PK)
- `user_id` (uuid, referência a `auth.users`)
- `name` (text) – nome da planilha
- `created_at` (timestamptz)

RLS garante que cada usuário vê e edita apenas suas próprias linhas.
