# HANDOFF — Ordini Elly Edition

## Stato (20 Ago 2026)

### Architettura
```
Android App (Expo SDK54) ─── HTTPS JWT ───┐
Windows App (Electron+Vite) ──────────────┤
                                           ▼
                               Cloudflare Worker (D1 SQLite)
```

### Worker (`ordini-elly-worker`)
- **URL**: `https://ordini-elly-worker.elly-order.workers.dev`
- **Auth**: JWT (jose) + PBKDF2
- **DB**: D1 `9f76e4ad-2874-438d-bf2e-0f4185b44aeb`
- **JWT_SECRET**: set as secret

| Method | Path | Auth | Desc |
|--------|------|------|------|
| POST | `/api/auth/login` | No | Login → token + crypto_salt |
| POST | `/api/auth/verify` | No | Verify token |
| POST | `/api/seed-admin` | No | Create/update admin |
| GET/POST | `/api/products` | Yes | List/Create |
| GET/PUT/DELETE | `/api/products/:id` | Yes | Read/Update/Delete |
| GET/POST | `/api/customers` | Yes | List/Create (decrypts fields) |
| GET/PUT/DELETE | `/api/customers/:id` | Yes | ... |
| GET/POST | `/api/orders` | Yes | List (with filters, payments, shared_reps) / Create (generates payments, shared reps) |
| GET | `/api/orders/stats/dashboard` | Yes | Stats with pending orders |
| GET | `/api/orders/:id` | Yes | Detail (payments, items with commission, shared reps) |
| PATCH | `/api/orders/:id/status` | Yes | Approve/Reject |
| GET/POST | `/api/users` | Yes | List/Create |
| PUT/DELETE | `/api/users/:id` | Yes | Edit/Delete |
| GET/POST/PUT/DELETE | `/api/listini` | Yes | CRUD listini |
| GET/PUT | `/api/listino-prices/:productId` | Yes | Get/Set prices per listino |
| GET/PUT | `/api/settings` | Yes | Key-value settings |
| GET | `/api/commission-exceptions` | Yes | CRUD category-level exceptions |
| GET | `/api/categories` | Yes (non-admin incluso) | List categorie dinamiche |
| POST/PUT/DELETE | `/api/categories` `.id` | Admin | Create/Rename/Delete (delete 409 se in uso, rename cascade) |
| GET/PUT/DELETE | `/api/product-commission-overrides/:productId` | Yes | Per-product commission overrides |
| POST | `/api/product-commission-overrides/auto-calculate` | Yes | Suggest commissions via price ratio |
| GET | `/api/payments` | Yes | List payments (filters: order_id, status, date, customer, user_id) |
| GET | `/api/payments/summary` | Yes | Aggregati (pending/overdue/paid totals + upcoming count) |
| PATCH | `/api/payments/:id` | Yes | Register payment → auto-update order.payment_status |
| GET | `/api/app-versions?platform=windows\\|android` | No | Versione release attiva per l'app (D1 settings `app_*`) |
| GET/HEAD | `/releases/apps/<platform>/<file>` | No | Servizio file di release da R2 bucket `ordini-releases` |
| GET | `/health` | No | Health check |

**Migrations**:
- `0001_schema.sql`: users, products, customers, orders, order_items
- `0002_crypto.sql`: `crypto_salt` on users
- `0003_customers_user_id.sql`: user_id on customers
- `0004_listini.sql`: listini, listino_prices, commission_exceptions, settings, listino_id on orders
- `0005_payments.sql`: payments, order_shared_reps, user roles, payment fields on orders
- `0006_product_commissions.sql`: product_commission_overrides, seed 35 products from spec, listino_prices for all
- `0007_merge_categories.sql`..`0013_document_type.sql`: merge categorie duplicate, seed prezzi L1, reseed catalogo, fix categorie, ruolo admin, immagini prodotto, document_type
- `0014_categories.sql`: tabella `categories` (id, name UNIQUE, sort_order) + seed 6 default (`vino bianco`, `vino rosso`, `prosecco`, `birre`, `distillati`, `extra`)

**Categorie dinamiche (nuovo, Ago 2026)**:
- Fonte di verità = tabella D1 `categories` (admin può rename/add/remove da Windows Settings).
- `GET /api/categories` autenticato (non-admin incluso); POST/PUT/DELETE admin-only. Delete bloccato con `409 { product_count }` se prodotti referenziati; rename fa cascade su `products` + `commission_exceptions` + `product_commission_overrides` via `env.DB.batch`.
- Windows: `useCategories` hook + `categoryIcon()` (fallback `Tag`); pannello admin in `SettingsScreen.tsx`.
- Android: sola visualizzazione — `categories.list()` con fallback `CATEGORIES`, emoji fallback `🏷️`.

**Legacy categories** (35 prodotti seedati storici):
`vino bianco`, `vino rosso`, `prosecco`, `birre`, `distillati`, `distillati_premium`, `extra`

**Commission resolution order**:
1. `product_commission_overrides[listino, prodotto]` → override manuale ✏️
2. `commission_exceptions[listino, categoria]` → eccezione categoria ⚡ (es. distillati_premium 20% su L1)
3. `listini.commission_percent` → default listino
4. Auto-calcolo: `base_commission × (prezzo_LN / prezzo_L1)` 📐

**Seed products** (35, da spec fornita):
- 12 vino bianco (Pecorino, Passerina, Chardonnay, Falanghina IGP, Fiano Avellino DOCG, Greco Tufo DOCG, Lacryma Christi DOCG, Solo Paga Bianco, Falanghina IGP Premium, Fiano DOC, Greco DOC, Coda di Volpe DOC)
- 6 vino rosso (Cesanese, Merlot, Taurasi DOCG, Solo Paga Rosso, Aglianico IGP Premium, Aglianico DOC)
- 1 extra (Rosato DOC)
- 3 birre (IPA, Begiam, Golden)
- 3 prosecco (Prosecco DOC, Cuvee Elli Morris, Cuvee Elly Rosé)
- 6 distillati (Limoncello, Vodka, Gin, Grappa Barrique, Grappa Bianca, Amaro)
- 4 distillati_premium (Gin Premium, Rum Premium, Grappa Barrique Premium, Amaro Premium)

**Note categorie** salvate in `settings`:
- `note_vini_foglia_doro`: "Trattative private specifiche gestite da Fabio."
- `note_bollicine`: "Trattative extra, quantità da negoziare, contattare Fabio per accordi una tantum."

### Android (`android-app/`)
- **SDK**: Expo 54, target Android 36
- **Package**: `com.ellyedition.ordini`
- **APK locale debug**: `android-app/OrdiniEllyEdition.apk` · **APK distribuito**: v1.0.1 via update system (vedi sotto)
- **Build**: `npx expo export:embed` + `./gradlew assembleDebug`

**Screens**:
- `CatalogScreen.tsx` — Grid 2/3 cols con nuovi 35 prodotti (senza foto, prezzo L1 = base). paddingBottom Platform-aware.
- `NewOrderScreen.tsx` — 3 step: info attività + listino + pagamento a 4 vie (Immediato/Anticipato/Rateale/Acconto+Saldo con input % e select gg) + rappresentanti condivisi. Step 2 mostra provvigione per prodotto. Step 3 tabella provvigioni + "?" info + alert pagamenti in sospeso cliente.
- `OrderHistoryScreen.tsx` — Filtri data/attività/costo con FlatList.
- `OrderDetailScreen.tsx` — Payment status badge, per-item commission breakdown, shared reps.
- `PaymentsScreen.tsx` (nuovo) — Summary cards + lista pagamenti per reps.
- `ProfileScreen.tsx` — Profilo + clienti + sync offline.
- `PaymentsScreen.tsx` — 4° tab Pagamenti 💳.

**Componenti chiave**:
- `FloatingCartButton.tsx` — Bottone fluttuante 62x62 bianco + badge + animato.
- `CartSheet.tsx` — Carrello modale con price editor e validazione ≥ L3.
- `GlassButton`, `GlassCard`, `GlassInput`, `StatusBadge`, `FadeInView`.

**Store**: `cartStore` (subscribe pattern) con supporto customPrice, selectedListinoId, payment_type, shared_user_ids.

**Offline**: `offlineQueue.ts` — salva ordini in SQLite locale se Worker non raggiungibile.

### Windows (`windows-app/`)
- **Stack**: Electron + React + TypeScript + Vite + Express (main process)
- **Main**: Express server on port 3899 + sql.js per DB locale

**Screens**:
- `DashboardScreen.tsx` — Stats + pending orders
- `OrdersScreen.tsx` — List with filters (status, date, rappresentante, cost, search)
- `CatalogScreen.tsx` — CRUD prodotti + AI background removal
- `ListiniScreen.tsx` — CRUD listini + eccezioni commissioni + settings
- `ProvvigioniScreen.tsx` (nuovo) — Per-product commissioni per listino: tabella, filtri, override editor, auto-calcolo bulk
- `PaymentsScreen.tsx` (nuovo) — Summary + payments table + register modal (admin only)
- `CustomersScreen.tsx`, `UsersScreen.tsx`, `SettingsScreen.tsx`

**Sidebar**: Dashboard, Ordini, Catalogo, Clienti, Utenti, Listini, **Provvigioni**, **Pagamenti**, Impostazioni

**API (`api.ts`)**: Tutti gli endpoint Worker + `payments.*`, `productCommissionOverrides.*`, `categories.*`

**Main process**: Express + sql.js per DB locale con schema speculare Worker.

### Client-Side Encryption
1. Worker genera `crypto_salt` per user (16 bytes hex)
2. Client deriva AES-256-GCM key via PBKDF2(password, salt, 100k iters)
3. Encrypted fields: `business_name`, `vat`, `iban`, `notes`
4. Android: `@noble/ciphers` + `@noble/hashes`. Windows: Web Crypto API.

### Payment System
- **payment_type**: `immediato` | `anticipato` | `dilazionato` | `acconto_saldo`
- Alla creazione ordine → generati record `payments` automaticamente
- `payment_status` su orders: `pending` | `partial` | `paid` | `overdue`
- `PATCH /api/payments/:id` aggiorna e propaga a order.payment_status
- Notifiche locali Android (expo-notifications) il giorno scadenza
- Alert Android se cliente ha pagamenti in sospeso (con opzione "Procedi comunque")

### Commission Sharing
- Tabella `order_shared_reps` collega ordine a rappresentanti aggiuntivi
- Commissione divisa equamente per N reps
- Windows: admin vede tutti i reps con provvigione individuale
- Android: rep vede solo i propri ordini (inclusi quelli condivisi)

### Update System (nuovo, Ago 2026)
- **Endpoint pubblico**: `GET /api/app-versions?platform=windows|android` → `{ version, url, mandatory, notes }` (nessun token; rate limit globale).
- **Config release**: chiavi D1 `settings` `app_version_<p>`, `app_download_url_<p>`, `app_mandatory_<p>`, `app_notes_<p>`. Nessuna migrazione (tabella `settings` esistente).
- **File hosting**: R2 bucket **`ordini-releases`** (privato); il worker serve via route pubblica `GET /releases/*` (binding `RELEASES`). Niente dominio R2 pubblico da configurare.
- **Pubblicazione CLI**: `node shared/scripts/publish-release.js --platform windows|android --file <path> --version x.y.z [--mandatory true|false] [--notes "..."]` → upload R2 + upsert settings (via wrangler, worker dir).
- **Admin UI**: Windows `SettingsScreen.tsx` → card **"Rilasci App"** (versione, URL, obbligatorietà, note per Windows e Android) salvata con `api.settings.update`.
- **Windows client**: `useUpdateChecker` (`src/renderer/services/useUpdateChecker.ts`) → check all'avvio + ogni 6h; IPC `app:getVersion` e `update:downloadAndInstall` in `main.ts`/`preload.js` (scarica exe nel temp e lo avvia); `UpdateBanner.tsx` (opzionale, "Più tardi") / `UpdateBlocker.tsx` (obbligatorio, blocca l'app).
- **Android client**: `updateService.ts` (`src/services/updateService.ts`) → store subscribe + AsyncStorage `last_update_check`, check all'avvio + ogni 6h; `Linking.openURL(url)` per scaricare l'APK; `UpdateBanner.tsx` / `UpdateBlocker.tsx` (Modal) montati in `App.tsx`.
- **Semver**: funzione condivisa `shared/app-versions.ts` (worker); copie locali Windows/Android (Metro/Electron non importano fuori cartella).
- **Stato attuale**: worker deployato; bucket R2 creato; **Windows 1.1.0** pubblicata (categorie dinamiche, non obbligatoria); **Android 1.1.0** pubblicata (fix catalogo: categorie auto-creative + ricarica al focus, non obbligatoria).
- **Fix catalogo (20 Ago 2026)**: il worker azzerava a `''` la categoria di un prodotto non presente in tabella `categories` → prodotto invisibile nel catalogo (le sezioni filtrano per categoria). Ora `validateCategory` auto-crea la categoria mancante (`INSERT ... sort_order = MAX+1`). Inoltre `CatalogScreen` Android ora ricarica al focus tab (`useFocusEffect`) — prima solo al mount, quindi i nuovi prodotti non apparivano finché non si riavviava l'app. Fix deployato in worker `845d6a68-7750-4afc-a603-c874ebba1290` e incluso nell'APK 1.1.0.

### Credentials
- Admin: `admin` / `admin123` (role='admin')
- Nuovi utenti: role='rep' di default

### Commands
```bash
# Deploy Worker
cd worker && npx wrangler deploy

# Apply D1 migration
cd worker && npx wrangler d1 migrations apply ordini-elly-db --remote

# Pubblica release (upload R2 + settings)
cd "Ordini Elly Edition" && node shared/scripts/publish-release.js --platform android --file <apk> --version 1.0.1 --mandatory false --notes "..."

# Build Android APK (cloud EAS, richiede git repo + eas auth)
cd android-app && npx eas build --platform android --profile preview --non-interactive

# Build Android APK (odierno, bundle locale per debug)
cd android-app
npx expo export:embed --platform android --dev false \
  --entry-file "$(pwd)/index.js" \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
cd android && ./gradlew assembleDebug --no-daemon

# Start Windows dev
cd windows-app && npm run dev

# Test login
curl -X POST https://ordini-elly-worker.elly-order.workers.dev/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

### APK
- Ultimo APK distribuito (update OTA): **v1.1.0** → `https://ordini-elly-worker.elly-order.workers.dev/releases/apps/android/ordini-elly-1.1.0.apk` (75MB, non obbligatoria, note "Fix catalogo: categorie auto-creative, prodotti visibili subito + ricarica al focus")
- Build produzione: `cd android-app && npx eas build --platform android --profile preview --non-interactive` (richiede git pulito + eas auth). EAS riporta `appVersion` da package.json (1.0.0) nel build:list ma il versionName reale deriva da `app.json` → `expo.version` (1.1.0).
- Build locale di sviluppo: `/Users/alessio/Develop/Lavoro/Ordini Elly Edition/android-app/OrdiniEllyEdition.apk`

### Release Windows attuale
- **v1.1.0** → `https://ordini-elly-worker.elly-order.workers.dev/releases/apps/windows/Ordini_Elly_Edition_Setup_1.1.0.exe` (93MB, non obbligatoria, note "Categorie prodotti dinamiche")
- Build: `cd windows-app && npm run dist` (richiede wine per NSIS su macOS; output in `release/`).

---
Gen 20 Ago 2026. Session: sistema aggiornamenti in-app (worker app-versions + R2 releases, banner/blocker Windows+Android, IPC download-install, pannello admin Rilasci App, script publish-release, semver condiviso), **APK Android 1.1.0 e Windows 1.1.0 pubblicati come release OTA**, feature "Categorie Prodotti Dinamiche" implementata (migration 0014, worker routes, Windows admin panel + hook, Android visualizzazione), **fix catalogo** (auto-creazione categoria + ricarica al focus su Android).
