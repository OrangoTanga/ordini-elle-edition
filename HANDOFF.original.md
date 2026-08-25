# HANDOFF — Ordini Elly Edition

## Stato Attuale (15 Luglio 2026)

### Architettura

```
┌─────────────────────┐      ┌─────────────────────────────┐
│  Android App (Expo) │      │  Windows App (Electron)      │
│  SDK 54 / Expo Go   │      │  Vite + React + Electron     │
│  OrdiniEllyEdition   │      │  windows-app/                │
│  .apk standalone     │      │                              │
└────────┬────────────┘      └──────────┬──────────────────┘
         │                               │
         │       HTTPS (JWT Bearer)      │
         └───────────────┬───────────────┘
                         │
               ┌─────────▼──────────┐
               │  Cloudflare Worker  │
               │  ordini-elly-worker │
               │  + D1 (SQLite)     │
               │  + R2 (no, base64) │
               └────────────────────┘
```

### Worker Cloudflare
- **URL**: `https://ordini-elly-worker.elly-order.workers.dev`
- **Stack**: TypeScript, Hono-like routing (manuale)
- **Auth**: JWT (jose) + PBKDF2 password hashing
- **DB**: D1 SQLite (9f76e4ad-2874-438d-bf2e-0f4185b44aeb)
- **JWT_SECRET**: impostato come secret

**API Endpoints**:
| Method | Path | Auth | Descrizione |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login, restituisce token + crypto_salt |
| POST | `/api/auth/verify` | No | Verifica validità token |
| POST | `/api/seed-admin` | No | Crea/aggiorna utente admin |
| GET/POST | `/api/products` | Sì | Lista / Crea prodotti |
| GET/PUT/DELETE | `/api/products/:id` | Sì | Leggi / Modifica / Elimina |
| GET/POST | `/api/customers` | Sì | Lista / Crea clienti |
| GET/PUT/DELETE | `/api/customers/:id` | Sì | ... |
| GET/POST | `/api/orders` | Sì | Lista / Crea ordini |
| GET | `/api/orders/stats/dashboard` | Sì | Statistiche |
| GET | `/api/orders/:id` | Sì | Dettaglio ordine |
| PATCH | `/api/orders/:id/status` | Sì | Approva/Rifiuta |
| GET/POST | `/api/users` | Sì | Lista / Crea utenti |
| PUT/DELETE | `/api/users/:id` | Sì | Modifica / Elimina |
| GET | `/health` | No | Health check |

**Migrazioni D1 applicate**:
- `0001_schema.sql`: tabelle users, products, customers, orders, order_items
- `0002_crypto.sql`: colonna `crypto_salt` su users

**Categorie fisse** (validate lato Worker):
`vino bianco`, `vino rosso`, `prosecco`, `birre`, `distillati`, `extra`

**Immagini**: accetta `data:` URI (base64) e URL http/https. Validate in `validateImagePath()`.

### Android App (`android-app/`)
- **SDK**: Expo 54, target Android 36
- **Package**: `com.ellyedition.ordini`
- **File APK**: `android-app/OrdiniEllyEdition.apk` (137MB debug, standalone)
- **Entry**: `index.js` → re-export di `expo/AppEntry.js`
- **Build**: `npx expo export:embed` per bundle JS + `./gradlew assembleDebug`

**Componenti principali**:
- `src/navigation/AppNavigator.tsx` — 3 tab: Catalogo, Ordini, Profilo
- `src/screens/CatalogScreen.tsx` — Griglia 2/3 colonne, categorie fisse, ricerca
- `src/screens/NewOrderScreen.tsx` — Creazione ordine in 3 step
- `src/screens/OrderHistoryScreen.tsx` / `OrderDetailScreen.tsx` — Storico ordini
- `src/screens/ProfileScreen.tsx` — Profilo + impostazione colonne + sincronizzazione
- `src/components/ProductCard.tsx` — Card quadrata con immagine sfondo bianco
- `src/components/CartSheet.tsx` — Carrello con +/- , input quantità, tasto elimina
- `src/components/CartBar.tsx` — Barra persistente carrello
- `src/store/cartStore.ts` — Store carrello (subscribe pattern)
- `src/store/authStore.ts` — Store auth
- `src/services/api.ts` — API wrapper + encrypt/decrypt ordini
- `src/services/crypto.ts` — AES-256-GCM + PBKDF2 (pure JS, @noble/ciphers)
- `src/services/offlineQueue.ts` — Coda offline con retry

**Punti chiave**:
- `expo-image-picker` installato (plugin in app.json) per foto
- `react-native-reanimated` rimosso (crashava Expo Go)
- Criptografia sensibile (`business_name`, `vat`, `iban`, `notes`) prima dell'invio

### Windows App (`windows-app/`)
- **Stack**: Electron + React + TypeScript + Vite
- **Vite proxy**: `/api/` → Worker (dev), diretto Worker URL (prod)
- **Main process**: `src/main.ts` — finestra Electron, senza Express/tunnel/Drive

**Componenti**:
- `src/renderer/App.tsx` — Router lato renderer
- `src/renderer/screens/CatalogScreen.tsx` — CRUD prodotti + upload foto + **scontorno IA**
- `src/renderer/screens/LoginScreen.tsx` — Login
- `src/renderer/screens/OrdersScreen.tsx` — Gestione ordini (approva/rifiuta)
- `src/renderer/screens/DashboardScreen.tsx` — Statistiche
- `src/renderer/screens/CustomersScreen.tsx` — CRUD clienti
- `src/renderer/screens/UsersScreen.tsx` — CRUD utenti
- `src/renderer/screens/SettingsScreen.tsx` — Impostazioni Worker URL
- `src/renderer/api.ts` — API wrapper + encrypt/decrypt
- `src/renderer/crypto.ts` — AES-256-GCM (Web Crypto API)
- `src/renderer/components/GlassCard.tsx` — Componenti UI vetro

**Scontorno immagini**: usa `@imgly/background-removal` (modello IA locale, ~15MB download prima volta). Pulsante "Scontorna" nel form prodotto.

### Crittografia Client-Side

**Schema**:
1. Worker genera `crypto_salt` casuale per ogni utente (16 byte hex)
2. Client deriva chiave AES-256-GCM via PBKDF2(password, salt, 100k iterazioni)
3. Ordini: campi `business_name`, `vat`, `iban`, `notes` criptati prima di POST
4. Worker salva blob criptato in D1 (non può leggere)
5. Client decripta al ricevimento
6. Se chiave assente (app restart), campi restano criptati — login refresh

**Android**: `@noble/ciphers` + `@noble/hashes` (pure JS, Expo Go compatibile)
**Windows**: Web Crypto API (Electron Chromium)

### Credenziali
- Admin: `admin` / `admin123`

### Comandi Utili

```bash
# Deploy Worker
cd worker && npx wrangler deploy

# Build Android APK
cd android-app
npx expo export:embed --platform android --dev false \
  --entry-file "$(pwd)/index.js" \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
cd android && ./gradlew assembleDebug --no-daemon

# Avviare app Windows (dev)
cd windows-app && npm run dev

# Login admin per test
curl -X POST https://ordini-elly-worker.elly-order.workers.dev/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'

# Seed admin
curl -X POST https://ordini-elly-worker.elly-order.workers.dev/api/seed-admin
```

### File APK
`/Users/alessio/Develop/Lavoro/Ordini Elly Edition/android-app/OrdiniEllyEdition.apk`

---
Generato il 15 Luglio 2026. Contesto completo pronto per nuova sessione.
