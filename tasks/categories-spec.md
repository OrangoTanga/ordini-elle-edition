# Spec: Categorie Prodotti Dinamiche (Windows + Android)

## Objective
Rendere le categorie prodotto modificabili dall'admin: cambiare nome, aggiungere o rimuovere categorie su Windows. La fonte di verità è la tabella D1 `categories` nel worker; Windows e Android leggono le categorie via API (con fallback alle 6 predefinite se offline/fetch fallisce). Android è solo visualizzazione, nessuna UI di gestione.

## Tech Stack
- Worker Cloudflare (D1 + TypeScript), rotte stile esistente (`handleX` in `worker/src/routes/`).
- Windows: Electron + React renderer, stile esistente (api.ts, screens).
- Android: Expo/React Native, stile esistente (services/api.ts, types/index.ts).

## Commands
```
Worker typecheck:    cd worker && npx tsc --noEmit
Worker deploy:       cd worker && npx wrangler deploy
Worker migration:    cd worker && npx wrangler d1 execute ordini-elly-db --remote --file migrations/0014_categories.sql
Windows typecheck:   cd windows-app && npx tsc -p tsconfig.main.json && npx tsc -p tsconfig.json
Android typecheck:   cd android-app && npx tsc --noEmit
```

## Project Structure
- `worker/src/routes/categories.ts` → nuovi handler (list/create/rename/remove).
- `worker/src/routes/products.ts` → `validateCategory` diventa DB-backed (async, accetta categorie esistenti).
- `worker/src/index.ts` → registra rotte: `GET /api/categories` autenticato non-admin; mutazioni admin-only.
- `worker/migrations/0014_categories.sql` → tabella + seed 6 default.
- `windows-app/src/renderer/api.ts` → cliente `categories`.
- `windows-app/src/renderer/categories.ts` → `DEFAULT_CATEGORIES` + `CATEGORY_ICONS` + icona fallback.
- `windows-app/src/renderer/services/useCategories.ts` → hook con fallback.
- `windows-app/src/renderer/screens/CatalogScreen.tsx`, `ProvvigioniScreen.tsx` → liste dinamiche.
- `windows-app/src/renderer/screens/SettingsScreen.tsx` → pannello admin categorie.
- `android-app/src/types/index.ts` → `ProductCategory` rilassata a string; `CATEGORIES` resta come fallback.
- `android-app/src/services/api.ts` → `api.categories.list()`.
- `android-app/src/screens/CatalogScreen.tsx` → fetch dinamico con fallback.

## Code Style
Stile esistente: handler worker con `env.DB.prepare(...)`, risposte `Response.json({ success, data | error })`; componenti React con `tokens`, `GlassCard/GlassButton/Modal`; Android con `View/Text`, `LayoutAnimation`, identica struttura `CatalogScreen`.

## Testing Strategy
- Typecheck su worker, Windows (main+renderer), Android.
- Verifica endpoint via curl dopo deploy (auth + admin); `GET /api/categories` senza token → 401.
- Verifica manuale UI: rename in cascata (prodotto cambia sezione), add visibile nei dropdown, remove bloccato se prodotti referenziati.

## Boundaries
- Always: typecheck prima di concludere; aggiornare `tasks/plan.md`, `tasks/todo.md`, `HANDOFF.md`; seed preferisce `INSERT OR IGNORE`.
- Ask first: deploy worker, build APK Android, cambi schema oltre la nuova migration.
- Never: loggare secret; rimuovere funzioni senza verifica; deploy senza typecheck.

## Success Criteria
- `GET /api/categories` restituisce le 6 default subito dopo la migration (auth valida).
- `PUT /api/categories/:id` rinomina e aggiorna `products.category` + `commission_exceptions.category` in cascata.
- `DELETE /api/categories/:id` con prodotti referenziati → 409 + conteggio; senza prodotti → rimozione + pulizia eccezioni.
- Windows: chip/filtri/dropdown/`select` usano le categorie da API; "Categorie" admin card permette add/rename/remove.
- Android: CatalogScreen mostra le categorie dinamiche; fallback alle 6 se offline.
- Worker `validateCategory` accetta qualsiasi categoria esistente in tabella (non più lista hardcoded).

## Open Questions
- Nessuna (4 decisioni confermate: tabella D1, cascade rename, icona default fallback, Android visualizzazione sola).