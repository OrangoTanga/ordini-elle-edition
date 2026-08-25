# Implementation Plan: Categorie Prodotti Dinamiche (Windows + Android)

## Overview

Le categorie prodotto oggi sono hardcoded in 5 punti (worker `VALID_CATEGORIES`, shared/types, Windows CatalogScreen + ProvvigioniScreen, Android types). La nuova tabella D1 `categories` diventa l'unica fonte di verità. L'admin le gestisce da Windows (Settings); Windows e Android le leggono via `GET /api/categories` con fallback alle 6 predefinite se offline. Rename in cascata su `products.category` e `commission_exceptions.category`. Android: solo visualizzazione.

## Architecture Decisions

- **Tabella D1 `categories`** (`id`, `name` UNIQUE, `sort_order`) + seed dei 6 default nella migration 0014 (`INSERT OR IGNORE`).
- **`GET /api/categories`** autenticato ma non admin-only (tutti i client la leggono). Mutazioni (POST/PUT/DELETE) admin-only, nella sezione admin di `index.ts`.
- **Rename = cascade per stringa**: `PUT /api/categories/:id` con `name` aggiorna `products.category` e `commission_exceptions.category` via `env.DB.batch` in un'unica operazione.
- **Delete bloccato se referenziato**: `DELETE /api/categories/:id` restituisce `409 { product_count }` se esistono prodotti con quella categoria; altrimenti rimuove eccezioni commission della categoria e la riga.
- **Worker `validateCategory` DB-backed**: accetta qualunque categoria presente in `categories`; altrimenti `''`. Niente più lista hardcoded.
- **Icone**: mappa `CATEGORY_ICONS` per nome resta client-side (Windows/Android), con icona fallback di default (Tag in Windows, emoji `✨` in Android) per categorie non mappate. Non in DB.
- **Fallback offline**: costante `DEFAULT_CATEGORIES` (le 6 attuali) usata quando la fetch fallisce; hook `useCategories` in Windows, fetch inline in Android.
- **Rotte mutazioni**: `POST /api/categories` (add), `PUT /api/categories/:id` (rename), `DELETE /api/categories/:id` (remove). Nome normalizzato (trim, non vuoto, unico).
- **Windows main mirror** (`windows-app/src/main/routes/products.ts` + sql.js): NON toccato — il renderer parla direttamente col worker via `api.ts` (confermato: `getApiUrl()` → worker, `DEV_PROXY` vuoto). Fuori scope.

## Task List

### Phase 1: Worker backend
- [x] **T1: Migration 0014** — `worker/migrations/0014_categories.sql`: `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, sort_order INTEGER DEFAULT 0)`, seed 6 default con `INSERT OR IGNORE`.
- [x] **T2: Route categories** — `worker/src/routes/categories.ts`: `handleListCategories`, `handleCreateCategory`, `handleRenameCategory` (cascade via batch), `handleDeleteCategory` (409 se prodotti, altrimenti pulizia eccezioni + delete).
- [x] **T3: Registrazione rotte** — `worker/src/index.ts`: `GET /api/categories` subito dopo l'authenticate; POST/PUT/DELETE nella sezione admin-only.
- [x] **T4: validateCategory DB-backed** — `worker/src/routes/products.ts`: `validateCategory` diventa async, verifica esistenza in `categories`, accetta o `''`. Aggiorna le due chiamate in create/update (await).

### Checkpoint: Worker
- [x] `cd worker && npx tsc --noEmit`
- [x] Deploy migration + worker (coordinato: `npx wrangler d1 execute ordini-elly-db --remote --file migrations/0014_categories.sql`, `npx wrangler deploy`)

### Phase 2: Windows client
- [x] **T5: Cliente API + icone** — `api.ts`: `categories.list/create/rename/remove`. Nuovo `renderer/categories.ts`: `DEFAULT_CATEGORIES` (6 attuali), `CATEGORY_ICONS` (vino→Wine, extra→Image, default→Tag), `categoryIcon(name)`.
- [x] **T6: Hook useCategories** — `renderer/services/useCategories.ts`: fetch su mount, fallback `DEFAULT_CATEGORIES`, espone `{ categories, loading, refresh }`.
- [x] **T7: CatalogScreen dinamico** — sostituire `const CATEGORIES` con lo hook: chips filtro (`['Tutti', ...categories]`), sezioni per categoria, select nel form, `categoryIcon(name)` per l'icona.
- [x] **T8: ProvvigioniScreen dinamico** — dropdown `category` (riga 314) da hook.

### Checkpoint: Windows
- [x] `cd windows-app && npx tsc -p tsconfig.main.json && npx tsc -p tsconfig.json`

### Phase 3: Admin Windows (Settings)
- [x] **T9: Pannello Categorie** — `SettingsScreen.tsx`: card admin "Categorie Prodotti" (lista con rename inline, campo add, bottone remove; errori 409 mostrati). Solo ruolo admin.

### Phase 4: Android client
- [x] **T10: Tipi + API Android** — `types/index.ts`: `ProductCategory` rilassata a `string`, `CATEGORIES` resta come fallback `DEFAULT`. `services/api.ts`: `categories.list()`.
- [x] **T11: CatalogScreen Android dinamico** — fetch `api.categories.list()` con fallback, usato per chip e sezioni; `CATEGORY_ICONS` con fallback emoji.

### Checkpoint: Android
- [x] `cd android-app && npx tsc --noEmit`

### Phase 5: Verifica + docs
- [x] **T12: Verifica end-to-end** — typecheck worker/windows/android; deploy migration+worker; curl `GET /api/categories` (senza token→401, con token→6 default), test rename/add/remove con utente finto poi rollback.
- [x] **T13: Docs** — aggiornare `tasks/plan.md`, `tasks/todo.md`, `HANDOFF.md` con stato finale.

### OTA (release in produzione)
- [x] **Release Windows 1.1.0** — `npm run dist` (NSIS installer), pubblicata via `publish-release.js` (R2 + settings D1). Verificata `GET /api/app-versions?platform=windows` → 1.1.0 live.
- [x] **Release Android 1.1.0** — app.json 1.1.0; build via EAS (`npx eas build -p android --profile preview --non-interactive`, commit `541c23c`), pubblicata via `publish-release.js --platform android --version 1.1.0 --notes "Fix catalogo..."`. Verificata live.

### Fix catalogo (post-release, 20 Ago 2026)
- [x] **F1: Backend auto-categoria** — `validateCategory` ora AUTO-CREA la categoria mancante (INSERT `sort_order = MAX+1`) invece di azzerare a `''`. Causa: prodotto con categoria non in tabella risultava invisibile nel catalogo (sezioni filtrate per categoria). Deployato, verificato end-to-end.
- [x] **F2: Reload al focus Android** — `CatalogScreen.tsx` carica i prodotti con `useFocusEffect` (non solo al mount) → i nuovi prodotti appaiono al ritorno sul tab. Typecheck OK.
- [x] **F3: publish-release.js** — path `--file` con spazi ora quotato (prima falliva).

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Rename non atomico | Prodotti con categoria orfana | `env.DB.batch` per categoria+products+exceptions in un colpo |
| Categoria usata da prodotti e rimossa | Dati orfani | 409 con `product_count`, UI mostra errore; admin deve prima riassegnare |
| Fallback hardcoded non sincronizzato con DB | Visualizzazione stantia | Fetch ad ogni mount (CatalogScreen) e refresh esplicito; fallback solo se offline |
| Prodotti con categoria non più esistente (da vecchie data) | Sezioni mancanti | `GET /api/categories` restituisce comunque i prodotti nel list; la sezione appare solo se la categoria esiste. Fuori scope: migrazione dati legacy |

## Open Questions
- [ ] Nessuna bloccante. Nota: eventuali prodotti con `category` non più esistente restano in DB col vecchio valore (non mostrati nelle sezioni). Valutare in futuro una UI per riassegnarli.