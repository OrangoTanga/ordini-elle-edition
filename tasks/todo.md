# Task List — Sistema Aggiornamenti (COMPLETATO)

> ✅ Tutte le task di questa lista sono completate (release Android 1.0.1 pubblicata, sistema OTA live).

## Piano corrente → `tasks/plan.md`
La feature attiva è **"Categorie Prodotti Dinamiche"** (T1–T13 + OTA). Seguire `tasks/plan.md`.

## Phase 1: Fondazione condivisa
- [x] T1: `shared/app-versions.ts` (compareVersions, isUpdateAvailable) + test Node rapido
- [x] T2: `shared/scripts/publish-release.js` (upload R2 + update D1 settings)

## Checkpoint 1: Fondazione
- [x] T1 test semver passa; T2 parse sintattico ok

## Phase 2: Worker backend
- [x] T3: `worker/src/routes/appVersions.ts` + rotta pubblica in `index.ts` (prima di authenticate)
- [x] T4: binding R2 `RELEASES` in `wrangler.toml` + route `GET /releases/*` che serve file

## Checkpoint 2: Worker
- [x] `npx wrangler types` ok; `npx tsc --noEmit` in worker
- [x] Bucket `ordini-releases` creato (`npx wrangler r2 bucket create`)
- [x] Deploy worker (`npx wrangler deploy`) — coordinare con utente se serve auth
- [x] Manuale: `GET /api/app-versions?platform=windows` risponde

## Phase 3: Windows client
- [x] T5: IPC `app:getVersion` + `update:downloadAndInstall` in `main.ts` e `preload.js`
- [x] T6: `appVersions.get` in `api.ts` + `services/updateService.ts` (check avvio + 6h)
- [x] T7: `UpdateBanner.tsx` + `UpdateBlocker.tsx` montati nella root
- [x] T8: pannello admin "Rilasci app" in `SettingsScreen.tsx`

## Checkpoint 3: Windows
- [x] `npx tsc -p tsconfig.main.json && npx tsc -p tsconfig.json`

## Phase 4: Android client
- [x] T9: `services/updateService.ts` (fetch + semver + AsyncStorage + 6h)
- [x] T10: `UpdateBanner.tsx` + `UpdateBlocker.tsx` in `App.tsx` (Linking.openURL)

## Checkpoint 4: Android
- [x] `cd android-app && npx tsc --noEmit`

## Phase 5: Versioni + docs
- [x] T11: `app.json` Android → 1.0.1
- [x] T12: aggiornare `HANDOFF.md`

## Solo su richiesta utente (NON eseguire senza conferma)
- [ ] Rebuild + nuova build APK Android (`eas build --platform android --profile preview`)

## Fix catalogo (20 Ago 2026)
- [x] F1: worker `validateCategory` auto-crea la categoria mancante (era azzerata a `''` → prodotto invisibile). Deployato + verificato.
- [x] F2: `CatalogScreen` Android ricarica al focus tab (`useFocusEffect`). Committato in `541c23c`.
- [x] F3: `publish-release.js` quota la path `--file` (bug con spazi).
- [x] F4: APK Android 1.1.0 buildato via EAS (`2e7ded68`) e pubblicato OTA (`ordini-elly-1.1.0.apk`).