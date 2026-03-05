# Testes e checklist completo — App e Plataforma Web

Este documento responde: **se o app e a web estão funcionando**, **quais páginas existem em cada um**, **como testar** e **checklist de tudo que foi feito**.

---

## 1. Visão geral: App vs Plataforma Web

| | **App (Planilha Sea Nutri)** | **Plataforma Web** |
|--|------------------------------|---------------------|
| **Foco** | Uso em campo: preencher planilhas, registrar NCs, histórico | Gestão e análise: ver NCs pendentes, validar/descartar, ver planilhas por unidade |
| **Login** | Supabase do app (e-mail/senha) | **Mesmo** Supabase do app (mesmos usuários) |
| **Backend principal** | Supabase (projeto do app) | Supabase do **app** para planilhas/NCs; Supabase da **web** para Documentos/Cardápios |
| **Páginas exclusivas do app** | Planilhas de temperatura (preencher), Histórico de planilhas, Análise de NCs (lista), Cadastro/recuperação de senha | — |
| **Páginas exclusivas da web** | — | Dashboard com resumo + NCs pendentes, Análise por unidade, Detalhe da planilha (validar/descartar), Tela de sucesso |
| **Páginas em comum** | Cardápios, Documentos de Qualidade, Dashboard (resumo + cards de planilhas) | Cardápios, Documentos de Qualidade, Dashboard (resumo + NCs + unidades) |

---

## 2. Rotas e páginas

### 2.1 App (Planilha Sea Nutri)

| Rota | Página | O que faz |
|------|--------|-----------|
| `/login` | Login | Entrar com e-mail/senha (Supabase do app) |
| `/signup` | Signup | Criar conta |
| `/reset-password` | ResetPassword | Recuperar senha |
| `/loading` | Loading | Transição pós-login |
| `/dashboard` | Dashboard | Resumo (conformidade, registros, NCs), cards das planilhas (Café, Almoço, Jantar, etc.) e **Criar minha planilha** |
| `/spreadsheet/breakfast` | BreakfastSheet | Planilha Café da Manhã |
| `/spreadsheet/cold-lunch` | ColdLunchSheet | Planilha Almoço |
| `/spreadsheet/dinner` | DinnerSheet | Planilha Jantar |
| `/spreadsheet/supper` | SupperSheet | Planilha Ceia |
| `/spreadsheet/snacks` | SnacksSheet | Planilha Lanches |
| `/spreadsheet/defrosting` | DefrostingSheet | Planilha Descongelamento |
| `/spreadsheet/custom/:id` | CustomSheetPage | Planilha personalizada (Supabase custom_sheets ou localStorage) |
| `/finalized/:id` | Finalized | Confirmação de planilha finalizada |
| `/historico-planilhas` | HistoricoPlanilhas | Lista de planilhas finalizadas |
| `/analise-ncs` | AnaliseNCs | Lista de NCs (pendentes/validadas) no app |
| `/cardapios` | Cardapios | Cardápios (projeto web) |
| `/documentos-qualidade` | DocumentosQualidade | Documentos de qualidade (projeto web) |
| `*` | NotFound | 404 |

### 2.2 Plataforma Web (páginas diferentes do app)

| Rota | Página | O que faz |
|------|--------|-----------|
| `/` | Login | Entrar com e-mail/senha do **Supabase do app** (mesma conta do app) |
| `/loading` | Loading | Carrega perfil e redireciona ao dashboard |
| `/dashboard` | Dashboard | **Resumo** (conformidade média, totais, NCs validadas/descartadas), **lista de NCs pendentes** (validar/descartar), **unidades** com link para análise por unidade |
| `/unit/:unitName` | UnitAnalysis | Lista de **planilhas finalizadas** daquela unidade (ex.: P-01, P-02) |
| `/unit/:unitName/spreadsheet/:sheetId` | SpreadsheetDetail | **Detalhe da planilha**: ver itens e NCs; abrir modal para **validar ou descartar** cada NC em lote |
| `/unit/:unitName/spreadsheet/:sheetId/success` | SpreadsheetSuccess | Confirmação após validar/descartar NCs da planilha |
| `/cardapios` | Cardapios | Cardápios (Supabase da web) |
| `/documentos-qualidade` | DocumentosQualidade | Documentos de qualidade (Supabase da web) |
| `*` | NotFound | 404 |

Ou seja: a **web** tem as páginas **Dashboard (com NCs pendentes)**, **Análise por unidade**, **Detalhe da planilha** e **Sucesso**, que **não existem no app** com esse fluxo (no app há Historico e AnaliseNCs, mas não “por unidade” nem “detalhe + validar em lote”).

---

## 3. Como rodar e testar

### 3.1 Pré-requisitos

- **Node.js** (ex.: 18+)
- **npm**
- Conta no Supabase do app (e-mail/senha) para login em **ambos** (app e web)
- Opcional: `.env` no app (ou use os fallbacks); na web, `.env` com `VITE_SUPABASE_APP_URL` e `VITE_SUPABASE_APP_ANON_KEY` (ver `docs/ENV_LOVABLE.md`)

### 3.2 Rodar o App (Planilha Sea Nutri)

```bash
cd "NutriQuali IA - Planilha Sea Nutri"
npm install
npm run dev
```

- Abra no navegador a URL que aparecer (ex.: `http://localhost:5173`).
- Teste: login → dashboard → abrir uma planilha → preencher → finalizar; depois Histórico e Análise de NCs; Cardápios e Documentos de Qualidade; “Criar minha planilha” (Supabase custom_sheets ou localStorage).

### 3.3 Rodar a Plataforma Web

```bash
cd "NutriQuali IA - Plataforma Web"
npm install
```

Crie o `.env` na raiz (se ainda não tiver) com:

```env
VITE_SUPABASE_APP_URL="https://cxtwomfylgebqdgacfgm.supabase.co"
VITE_SUPABASE_APP_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dHdvbWZ5bGdlYnFkZ2FjZmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTQzODQsImV4cCI6MjA4NzYzMDM4NH0.I-_y3KR5D4UIq6nzf79e9Mn7ZVvTMbSfTGcS9iL7uSc"
```

Depois:

```bash
npm run dev
```

- Abra a URL (ex.: `http://localhost:5173`).
- Teste: **login com a mesma conta do app** → Dashboard (resumo + NCs pendentes) → clicar em uma unidade → ver planilhas → abrir uma planilha → validar/descartar NCs → Cardápios e Documentos de Qualidade; Sair.

### 3.4 Testar integração App ↔ Web

1. **No app:** fazer login, preencher e **finalizar** uma planilha (pode incluir uma NC).
2. **Na web:** mesmo usuário (ou outro com role admin/nutricionista/gestor), fazer login.
3. **Dashboard web:** deve aparecer o resumo atualizado e, se houver NC pendente, na lista de NCs.
4. **Validar ou descartar** uma NC na web.
5. **No app:** abrir **Análise de NCs** (ou atualizar): o status da NC deve refletir (validada/descartada).
6. **Realtime:** em um navegador na web e outro no app (ou app + web), alterar algo (finalizar planilha no app ou validar NC na web) e conferir se a outra tela atualiza sozinha (ou após refresh, conforme implementação).

---

## 4. Checklist de testes (por projeto)

### 4.1 App (Planilha Sea Nutri)

- [ ] `npm install` e `npm run dev` sobem sem erro
- [ ] Login com e-mail/senha do Supabase do app
- [ ] Dashboard: resumo (conformidade, registros, NCs) e cards das planilhas
- [ ] “Criar minha planilha”: criar, abrir e usar (Supabase custom_sheets ou localStorage)
- [ ] Abrir cada tipo de planilha (Café, Almoço, Jantar, Ceia, Lanches, Descongelamento): preencher e finalizar
- [ ] Histórico de planilhas: lista de finalizadas
- [ ] Análise de NCs: lista de NCs (filtros pendentes/validadas)
- [ ] Cardápios e Documentos de Qualidade: abrir e usar (se configurados)
- [ ] Logout e novo login
- [ ] Build: `npm run build` conclui sem erro
- [ ] Se for usar Android: `npm run build`, `npx cap sync android`, `npx cap open android` (ver `docs/SETUP_CAPACITOR.md`)

### 4.2 Plataforma Web

- [ ] `npm install` e `npm run dev` sobem sem erro
- [ ] `.env` com `VITE_SUPABASE_APP_URL` e `VITE_SUPABASE_APP_ANON_KEY`
- [ ] Login com a **mesma** conta do app
- [ ] Sem sessão: ao acessar `/dashboard` direto, redireciona para `/`
- [ ] Dashboard: cards de resumo (conformidade, totais, NCs validadas/descartadas)
- [ ] Dashboard: lista de NCs pendentes (se houver)
- [ ] Validar uma NC: botão validar → toast de sucesso e NC some da lista
- [ ] Descartar uma NC: botão descartar → toast e NC some
- [ ] Clicar em uma unidade: vai para `/unit/:unitName`
- [ ] Análise por unidade: lista de planilhas finalizadas da unidade
- [ ] Abrir uma planilha: vai para detalhe (tabela + NCs)
- [ ] No detalhe: abrir modal de validação, marcar/desmarcar NCs, validar em lote → redireciona para success
- [ ] Menu: Cardápios, Documentos de Qualidade, Configurações, Sair
- [ ] Sair: limpa sessão e volta para `/`
- [ ] Build: `npm run build` conclui sem erro

### 4.3 Integração

- [ ] Planilha finalizada no app aparece na web (por unidade)
- [ ] NC criada no app aparece como pendente no dashboard da web
- [ ] Validar/descartar na web reflete no app (Análise de NCs / Realtime)
- [ ] Usuário com role admin/nutricionista/gestor consegue validar/descartar na web; sem role recebe erro (403)

---

## 5. Checklist completo do que foi feito (projeto)

### 5.1 App (Planilha Sea Nutri)

- [ ] **Capacitor:** projeto preparado para Android (e iOS em doc); scripts `cap:sync`, `android`, `ios`; `docs/SETUP_CAPACITOR.md`
- [ ] **Dashboard:** ajuste de layout dos cards de resumo (grid, texto quebrando); nome da planilha sempre dentro do card (line-clamp, overflow)
- [ ] **Planilhas personalizadas:** fluxo “Criar minha planilha”, persistência em **Supabase** (tabela `custom_sheets`) com fallback em localStorage; migration `20260227100000_custom_sheets.sql`; `docs/CUSTOM_SHEETS_SUPABASE.md`; `CustomSheetPage`, rota `/spreadsheet/custom/:id`
- [ ] **Supabase (único backend):** cliente com fallback de URL e anon key quando `.env` vazio; tabela `custom_sheets` para planilhas personalizadas
- [ ] **Realtime:** Dashboard e AnaliseNCs inscritos em `spreadsheets` e `non_conformities`
- [ ] **Erros/UI:** ErrorBoundary ("Algo deu errado"); import do logo no Dashboard; Loading com fallback se logo falhar
- [ ] **Documentação:** `ENV_LOVABLE.md`, `CUSTOM_SHEETS_SUPABASE.md`, `SETUP_CAPACITOR.md`, `TESTES_E_CHECKLIST.md`

### 5.2 Plataforma Web

- [ ] **Integração com o app:** cliente `supabaseApp` apontando para o Supabase do app; leitura de `spreadsheets`, `non_conformities`, `units`; mapeamento de `validation_status` para o formato da web
- [ ] **Login:** tela de login usando Supabase do app (`supabaseApp.auth.signInWithPassword`); sessão persistida
- [ ] **Loading:** checagem de sessão; carregamento do perfil (nome); redirecionamento para dashboard ou login
- [ ] **Dashboard:** resumo (stats) e lista de NCs pendentes; botões validar/descartar chamando Edge Function com JWT do usuário
- [ ] **Análise por unidade:** página `UnitAnalysis` listando planilhas por unidade; Realtime
- [ ] **Detalhe da planilha:** página `SpreadsheetDetail` com validação em lote (validar/descartar NCs) via Edge Function
- [ ] **Página de sucesso:** `SpreadsheetSuccess` após validar em lote
- [ ] **Proteção de rotas:** Dashboard, UnitAnalysis e SpreadsheetDetail redirecionam para `/` se não houver sessão
- [ ] **Logout:** menu Sair chama `supabaseApp.auth.signOut()`
- [ ] **Sync (Edge Function):** `syncMobile.ts` usa JWT do usuário (getSession) para `syncNCValidate`, `syncNCDiscard`, `syncBulkValidate`; tratamento de erro (toast em 401/403)
- [ ] **Realtime:** `subscribeAppRealtime` no Dashboard e UnitAnalysis para refletir alterações do app
- [ ] **Documentação:** `docs/INTEGRACAO_APP_PLANILHAS.md`

### 5.3 Comum / integração

- [ ] **Fonte única para planilhas/NCs:** app e web usam o mesmo projeto Supabase do app para auth (web), planilhas e NCs
- [ ] **Verificação de conformidades:** fluxo na web (validar/descartar) atualiza o banco do app via Edge Function `update-nc-status`; app vê em tempo real
- [ ] **Documentos de Qualidade e Cardápios:** na web continuam no Supabase da web; no app usam o mesmo projeto web (se configurado)

---

## 6. Resumo rápido

- **App e web estão preparados para funcionar:** app com **apenas Supabase** (planilhas, NCs, auth e tabela `custom_sheets` para planilhas personalizadas; fallback localStorage se a tabela não existir); web com login no Supabase do app e páginas de análise e validação.
- **Plataforma web tem as páginas diferentes do app:** Dashboard (resumo + NCs pendentes), Análise por unidade, Detalhe da planilha (validar/descartar), Sucesso; além de Cardápios e Documentos de Qualidade.
- **Como testar:** rodar `npm run dev` em cada projeto, usar a mesma conta nos dois, finalizar planilha no app e validar/descartar NC na web; conferir Realtime/refresh.
- **Checklist:** use as seções 4 e 5 para marcar testes e itens implementados conforme for validando.
