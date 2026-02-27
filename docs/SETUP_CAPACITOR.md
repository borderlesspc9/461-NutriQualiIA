# Setup Capacitor — NutriQuali IA

Este documento descreve como compilar e rodar o app **NutriQuali IA** como aplicativo nativo (Android e iOS) usando Capacitor. O build web (Vite) gera a pasta `dist`, que o Capacitor usa no WebView.

---

## Pré-requisitos

### Android
- **Node.js** 18+ (LTS recomendado)
- **npm** (use `npm install`, não pnpm/yarn)
- **Android Studio** (Arctic Fox ou mais recente)
- **Android SDK** (API 24+ para build mínimo; API 34 recomendado para target)
- **Java (JDK)** 17 (recomendado para Capacitor 8 / Android Gradle Plugin 8)

### iOS (apenas no macOS)
- **Xcode** (versão mais recente da App Store)
- **CocoaPods**: `sudo gem install cocoapods`
- A plataforma iOS **não** é adicionada por padrão no Windows; no macOS, rode:
  ```bash
  npx cap add ios
  npm run build
  npx cap sync ios
  npm run ios
  ```

---

## Comandos rápidos — Android

```bash
# 1. Instalar dependências
npm install

# 2. Gerar build web (obrigatório antes de sync)
npm run build

# 3. Sincronizar web (dist) com o projeto Android
npx cap sync android
# ou: npm run cap:sync:android

# 4. Abrir projeto no Android Studio
npx cap open android
# ou: npm run android
```

No Android Studio: escolha um emulador ou device físico e clique em **Run**.

---

## Scripts npm disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run build` | Build de produção (gera `dist/`) |
| `npm run cap:sync` | Sincroniza `dist` com todas as plataformas |
| `npm run cap:sync:android` | Sincroniza apenas Android |
| `npm run android` | Abre o projeto Android no Android Studio |
| `npm run ios` | Abre o projeto iOS no Xcode *(apenas macOS, após `cap add ios`)* |

---

## Fluxo de desenvolvimento e atualização

Sempre que alterar o código **web** (React/Vite):

1. Gerar novo build:
   ```bash
   npm run build
   ```
2. Sincronizar com o app nativo:
   ```bash
   npx cap sync android
   # e, se tiver iOS: npx cap sync ios
   ```
3. Reabrir ou rodar novamente no Android Studio / Xcode.

Atalho: `npm run build && npx cap sync`

---

## Dev server (live reload) — opcional

Para testar o app no dispositivo/emulador apontando para o servidor de desenvolvimento (sem rebuildar a cada mudança):

1. No `capacitor.config.ts` (apenas em ambiente de dev), adicione temporariamente:
   ```ts
   const config: CapacitorConfig = {
     appId: 'com.nutriqualia.app',
     appName: 'NutriQuali IA',
     webDir: 'dist',
     server: {
       url: 'http://SEU_IP:8080',  // ex: http://192.168.1.10:8080
       cleartext: true,
     },
   };
   ```
2. Inicie o servidor: `npm run dev`
3. No mesmo Wi‑Fi, abra o app no device; ele carregará a URL do `server.url`.

**Contras:** requer mesmo Wi‑Fi e IP estável; não use em produção. Remova `server` antes de gerar build de release.

---

## Variáveis de ambiente (WebView)

O app usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase). No build de produção, elas são embutidas no bundle. Garanta que o `.env` (ou CI) esteja configurado antes de `npm run build`. O Supabase usa HTTPS; não é necessário configurar cleartext para a API.

Se no futuro o app acessar **HTTP** (não HTTPS) em ambiente de desenvolvimento no Android, pode ser necessário permitir cleartext no `AndroidManifest.xml` (não habilitado por padrão neste projeto).

---

## Problemas comuns

### Rotas SPA (React Router) e 404
- O app usa **React Router** com `BrowserRouter` e `base: "/"` no Vite. No Capacitor, o WebView carrega `index.html` de `dist` e as rotas são tratadas no lado cliente; não é necessário configurar fallback no servidor.
- Se alguma rota retornar 404 ao abrir direto (deep link), verifique se o servidor que entrega os arquivos estáticos está configurado para retornar `index.html` para todas as rotas. No Capacitor, o Android/iOS já servem os arquivos de `dist` e o roteamento é client-side.

### Cache / PWA
- Este projeto **não** usa PWA nem service worker. Se no futuro for adicionado (ex.: vite-plugin-pwa), um cache agressivo pode atrapalhar no WebView; em caso de problemas, desative o service worker ou o registro em build Capacitor.

### Permissões e rede
- Para acesso à internet (Supabase, etc.), o Android já permite por padrão. Permissões extras (câmera, arquivos) devem ser declaradas em `android/app/src/main/AndroidManifest.xml` e, se necessário, solicitadas em tempo de execução.

### Build Android falha (Gradle / Java)
- Confirme JDK 17 e que o `JAVA_HOME` aponta para ele.
- No Android Studio: **File → Invalidate Caches / Restart** e **Sync Project with Gradle Files**.

---

## Checklist final — Android

- [ ] `npm install` executado
- [ ] `npm run build` concluído com sucesso (pasta `dist` gerada)
- [ ] `npx cap sync android` executado
- [ ] `npx cap open android` abre o Android Studio
- [ ] App roda em emulador ou device físico
- [ ] Variáveis `VITE_*` configuradas no `.env` (ou no ambiente de build)

---

## Checklist final — iOS (macOS)

- [ ] No macOS: `npx cap add ios`
- [ ] `npm run build` e `npx cap sync ios`
- [ ] `npm run ios` (abre Xcode)
- [ ] CocoaPods instalado; `pod install` executado no `ios/App` se solicitado
- [ ] App rodando em simulador ou device
