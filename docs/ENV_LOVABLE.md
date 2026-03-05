# Como preencher o `.env` quando o projeto veio do Lovable

Se o projeto foi criado no **Lovable** e você não tem acesso ao painel do Lovable ou ao Supabase/Firebase originais, use uma destas opções.

---

## 0. App sem `.env` (fallback)

O **app (Planilha Sea Nutri)** já tem valores de fallback no código para Supabase. Ou seja:

- Se você **não preencher** o `.env`, o app usa o projeto Supabase que veio com o código (`cxtwomfylgebqdgacfgm`).
- Assim o app pode rodar mesmo sem nenhum `.env` (por exemplo depois de clonar o repositório).

Para a **Plataforma Web**, use no `.env` da web **os mesmos** URL e chave do app (ou os mesmos do fallback):

```env
VITE_SUPABASE_APP_URL="https://cxtwomfylgebqdgacfgm.supabase.co"
VITE_SUPABASE_APP_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dHdvbWZ5bGdlYnFkZ2FjZmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTQzODQsImV4cCI6MjA4NzYzMDM4NH0.I-_y3KR5D4UIq6nzf79e9Mn7ZVvTMbSfTGcS9iL7uSc"
```

Assim a web consegue ler/validar as mesmas planilhas e NCs que o app, sem você precisar acessar o Lovable.

---

## 1. Você já tem um `.env` no app (Planilha Sea Nutri)

Se na pasta do app **NutriQuali IA - Planilha Sea Nutri** já existir um arquivo `.env` com algo assim:

```env
VITE_SUPABASE_URL="https://xxxxx.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
```

então o **Supabase já está configurado**. Esses valores costumam vir:

- de um export do Lovable que inclui variáveis de ambiente, ou  
- de alguém da equipe que preencheu o `.env`.

**Para a Plataforma Web:** use os **mesmos** valores do app, com estes nomes:

```env
VITE_SUPABASE_APP_URL="https://cxtwomfylgebqdgacfgm.supabase.co"
VITE_SUPABASE_APP_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

(Substitua pela mesma URL e pela mesma chave que estão no `.env` do app.)

---

## 2. Onde conseguir as chaves (quando você tem acesso)

### Supabase (login, planilhas, NCs)

1. Acesse **https://supabase.com** e faça login.
2. Abra o **projeto** (o que o Lovable criou ou um que você criou).
3. Menu **Settings** (Configurações) â†’ **API**.
4. Copie:
   - **Project URL** â†’ use em `VITE_SUPABASE_URL` (e na web em `VITE_SUPABASE_APP_URL`).
   - **anon public** (chave pública) â†’ use em `VITE_SUPABASE_PUBLISHABLE_KEY` (e na web em `VITE_SUPABASE_APP_ANON_KEY`).

### Planilhas personalizadas (Supabase)

As planilhas criadas em "Criar minha planilha" usam a tabela **`custom_sheets`** no mesmo projeto Supabase. Rode a migration `supabase/migrations/20260227100000_custom_sheets.sql` no SQL Editor do Supabase. Se a tabela não existir, o app usa **localStorage** como fallback.


---

## 3. Não tenho acesso a nada (Lovable, Supabase ou Firebase)

Nesse caso você pode **criar seus próprios** projetos e usar as chaves no `.env`.

### Supabase (obrigatório para o app e a web)

1. Acesse **https://supabase.com** e crie uma conta (se precisar).
2. **New project** â†’ escolha nome, senha do banco, região.
3. Depois que o projeto estiver pronto: **Settings** â†’ **API** â†’ copie **Project URL** e **anon public**.
4. No Supabase, vá em **SQL Editor** e rode as migrations que estão na pasta **`supabase/migrations`** do repositório do app (para criar as tabelas `profiles`, `user_roles`, `units`, `spreadsheets`, `non_conformities`, etc.).
5. No `.env` do app e da web:

```env
VITE_SUPABASE_URL="https://SEU_PROJECT_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
```

Na web, use também:

```env
VITE_SUPABASE_APP_URL="https://SEU_PROJECT_REF.supabase.co"
VITE_SUPABASE_APP_ANON_KEY="eyJ..."
```

(Os valores são os mesmos do app.)

As **planilhas personalizadas** (â€œCriar minha planilhaâ€) usam a tabela **`custom_sheets`** no mesmo Supabase do app. Rode a migration `supabase/migrations/20260227100000_custom_sheets.sql` no projeto Supabase para criar a tabela (ver `docs/CUSTOM_SHEETS_SUPABASE.md`). Se a tabela não existir, o app usa **localStorage** como fallback.

---

## 4. Resumo por projeto

| Projeto              | Arquivo `.env` | Variáveis principais |
|----------------------|----------------|----------------------|
| **Planilha Sea Nutri (app)** | Na raiz do app | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **Plataforma Web**   | Na raiz da web | `VITE_SUPABASE_APP_URL`, `VITE_SUPABASE_APP_ANON_KEY` (mesmos valores do app); e as do projeto web para Documentos/Cardápios se existirem |

Depois de alterar o `.env`, reinicie o servidor (`npm run dev` ou equivalente).
