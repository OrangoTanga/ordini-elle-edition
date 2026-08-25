# Spec: Sistema di Aggiornamento App (Windows + Android)

## Objective

Quando una nuova release è disponibile, gli utenti di **Windows** e **Android** devono essere
avvisati che la loro app non è aggiornata, con possibilità di aggiornare direttamente dall'app.

- Chi: rappresentanti (Android + Windows) e admin (Windows).
- Successo: l'utente vede l'avviso "aggiornamento disponibile", può cliccare "Aggiorna ora"
  e l'app scarica/installa la nuova versione. L'admin configura la release dal pannello
  Impostazioni Windows senza toccare codice.
- Ogni release è configurable: **obbligatoria** (app bloccata finché non si aggiorna) o
  **opzionale** (rimandabile con "Più tardi").

## Architettura

```
Windows app ──GET /api/app-versions?platform=windows──┐
Android app ──GET /api/app-versions?platform=android──┤
                                                       ▼
                                  Cloudflare Worker (D1 settings)
                                                       │  (URL file R2)
                                                       ▼
                             R2 bucket pubblico (file .exe / .apk)
```

- Il **manifest** delle versioni vive nella tabella `settings` (key-value già esistente),
  gestito dall'admin via pannello in `SettingsScreen` (Windows, solo admin).
- I **file** degli installer/APK sono ospitati su **Cloudflare R2** (bucket pubblico,
  dominio `pub-*.r2.dev`). R2 non addebita egress: gratis per sempre alla scala del progetto.
- Endpoint pubblico non-autenticato: `GET /api/app-versions?platform=windows|android`
  (se necessario serve solo da dopo login; reso pubblico per semplicità, dati non sensibili).

## Tech Stack

- Worker: Cloudflare Worker (TypeScript) + D1 — stessi pattern esistenti.
- Windows: Electron 28 + React + TypeScript — nessuna dipendenza nuova.
- Android: Expo SDK 54 + React Native — solo `Linking` (browser) per l'install, nessuna dipendenza nuova.
- Upload release: script CLI locale che usa `npx wrangler r2 object put` (nessuna dipendenza npm nuova).

## Commands

```
# Verifica/typecheck Android
cd android-app && npx tsc --noEmit

# Typecheck Windows
cd windows-app && npx tsc -p tsconfig.main.json && npx tsc -p tsconfig.renderer.json

# Worker
cd worker && npx wrangler deploy
cd worker && npx wrangler d1 migrations apply ordini-elly-db --remote

# Pubblicare una release (upload del file su R2)
cd shared && node scripts/publish-release.js windows "path/to/Setup.exe" 1.1.0
cd shared && node scripts/publish-release.js android "path/to/app.apk" 1.1.0
```

## Project Structure

```
worker/src/routes/appVersions.ts   → GET handler versione app (nuovo)
worker/src/index.ts                → rotta pubblica /api/app-versions
worker/migrations/0014_*           → (opzionale) nessuna nuova tabella, usiamo settings

windows-app/src/main/main.ts       → IPC update:getVersion, update:download, update:install (exe)
windows-app/src/main/preload.js    → expone API update al renderer
windows-app/src/renderer/services/updateChecker.ts (nuovo) → check + semver compare
windows-app/src/renderer/components/UpdateBanner.tsx (nuovo) → banner/notifica
windows-app/src/renderer/components/UpdateBlocker.tsx (nuovo)  → schermata obbligatoria
windows-app/src/renderer/screens/SettingsScreen.tsx → pannello config release (admin)
windows-app/src/renderer/api.ts    → api.appVersions.get / set

android-app/src/services/updateChecker.ts (nuovo) → check + semver compare
android-app/src/components/UpdateBanner.tsx (nuovo)  → banner sopra navigator
android-app/App.tsx                → monta banner/blocking screen
shared/scripts/publish-release.js  (nuovo) → upload R2 via wrangler CLI
```

## Code Style

Seguire i pattern esistenti: componenti a stile `Glass*` su Android, token theme su Windows,
service `api.ts` con `fetchApi`, store a subscribe-pattern. Nessun commento superfluo.

## Testing Strategy

- TypeScript: `npx tsc --noEmit` (Android) e `tsc -p tsconfig.*.json` (Windows).
- Semver compare: funzione pura in `shared/` importata da entrambe le piattaforme (o duplicata
  minimalista). Verifica manuale del flusso end-to-end: pubblica una release fittizia → avviso → download.
- Test API: `curl "https://.../api/app-versions?platform=android"` dopo deploy.

## Boundaries

- Always: esegui i typecheck prima di fare deploy; aggiorna HANDOFF; versione in `package.json`/`app.json` allineata.
- Ask first: creare il bucket R2 (richiede un comando manuale una tantum), rendere il bucket pubblico.
- Never: non loggare URL/secret; non rendere obbligatoria una release per errore (checks espliciti).

## Success Criteria

1. `GET /api/app-versions?platform=X` restituisce `{ version, url, mandatory, notes }` dalla tabella `settings`.
2. Windows: all'avvio (e ogni 6h) controlla; se nuova versione → banner "Aggiornamento disponibile"
   con pulsante "Aggiorna ora" che scarica l'installer e lo avvia; se `mandatory` → schermata bloccante.
3. Android: all'avvio (e ogni 6h) controlla; banner con "Aggiorna ora" che apre il browser sul link
   APK (il browser gestisce download+install); se `mandatory` → schermata bloccante.
4. L'admin configura versione/URL/mandatory/note dal pannello Impostazioni (solo admin, solo Windows).
5. `publish-release.js` carica il file su R2 e stampa l'URL pubblico pronto da incollare nel pannello.

## Open Questions

- Il bucket R2 va creato una volta (manual). L'utente deve darmi accesso al dashboard Cloudflare
  o eseguire `npx wrangler r2 bucket create ordini-releases` + renderlo pubblico.
- La versione corrente Android in `app.json` è `1.0.0` ma l'ultimo APK è `v1.0.1`: allineo `app.json`
  alla versione dell'APK prima di pubblicare la prima release.