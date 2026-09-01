import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic, Statement } from 'sql.js'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

let SQL: SqlJsStatic
let db: SqlJsDatabase
let DB_PATH: string

function saveDb(): void {
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

export function getDbPath(): string {
  return DB_PATH
}

type RowObject = Record<string, any>

interface StmtWrapper {
  all: (...params: any[]) => RowObject[]
  get: (...params: any[]) => RowObject | undefined
  run: (...params: any[]) => { lastInsertRowid: number; changes: number }
  bind: (...params: any[]) => StmtWrapper
  step: () => boolean
  getAsObject: () => RowObject
  free: () => void
}

interface DbWrapper {
  prepare: (sql: string) => StmtWrapper
  transaction: (fn: () => void) => (...args: any[]) => any
  exec: (sql: string) => void
  run: (sql: string) => void
}

function wrapDb(): DbWrapper {
  return {
    prepare(sql: string): StmtWrapper {
      const stmt: Statement = db.prepare(sql)
      let bound = false

      const wrapper: StmtWrapper = {
        all(...params: any[]): RowObject[] {
          if (params.length > 0) { stmt.bind(params); bound = true }
          const results: RowObject[] = []
          while (stmt.step()) {
            results.push(stmt.getAsObject())
          }
          stmt.reset()
          return results
        },

        get(...params: any[]): RowObject | undefined {
          if (params.length > 0) { stmt.bind(params); bound = true }
          const hasRow = stmt.step()
          const result = hasRow ? stmt.getAsObject() : undefined
          stmt.reset()
          return result
        },

        run(...params: any[]): { lastInsertRowid: number; changes: number } {
          if (params.length > 0) { stmt.bind(params); bound = true }
          stmt.step()
          stmt.reset()
          const rowidResult = db.exec('SELECT last_insert_rowid() as id')
          const changesResult = db.exec('SELECT changes() as ch')
          const lastInsertRowid = Number(rowidResult?.[0]?.values?.[0]?.[0] ?? 0)
          const changes = Number(changesResult?.[0]?.values?.[0]?.[0] ?? 0)
          return { lastInsertRowid, changes }
        },

        bind(...params: any[]): StmtWrapper {
          stmt.bind(params)
          bound = true
          return wrapper
        },

        step(): boolean {
          return stmt.step()
        },

        getAsObject(): RowObject {
          const obj = stmt.getAsObject()
          stmt.reset()
          return obj
        },

        free(): void {
          stmt.free()
        },
      }

      return wrapper
    },

    transaction(fn: () => void): (...args: any[]) => any {
      return (..._args: any[]) => {
        db.run('BEGIN TRANSACTION')
        try {
          const result = fn()
          db.run('COMMIT')
          saveDb()
          return result
        } catch (e) {
          db.run('ROLLBACK')
          throw e
        }
      }
    },

    exec(sql: string): void {
      db.exec(sql)
    },

    run(sql: string): void {
      db.run(sql)
    },
  }
}

let wrappedDb: DbWrapper

export async function initDatabase(): Promise<void> {
  SQL = await initSqlJs()

  // Use userData directory for writable database (cross-platform)
  const userDataPath = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Application Support') : path.join(process.env.HOME || '', '.config'))
  const appDataDir = path.join(userDataPath, 'Ordini Elly Edition')
  DB_PATH = path.join(appDataDir, 'ordini.db')
  
  try {
    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir, { recursive: true })
    }
  } catch (mkdirErr) {
    console.error('[Database] Failed to create app data directory:', mkdirErr)
    // Fallback to temp directory
    DB_PATH = path.join(require('os').tmpdir(), 'Ordini Elly Edition', 'ordini.db')
    const fallbackDir = path.dirname(DB_PATH)
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true })
    }
  }

  // If database doesn't exist in userData, copy from bundled resource
  if (!fs.existsSync(DB_PATH)) {
    const bundledDbPath = path.join(__dirname, '../../database/ordini.db')
    try {
      if (fs.existsSync(bundledDbPath)) {
        fs.copyFileSync(bundledDbPath, DB_PATH)
      } else {
        // Create fresh database if no bundled version
        db = new SQL.Database()
        saveDb()
      }
    } catch (copyErr) {
      console.error('[Database] Failed to copy bundled database, creating fresh:', copyErr)
      db = new SQL.Database()
      saveDb()
    }
  } else {
    try {
      const buffer = fs.readFileSync(DB_PATH)
      db = new SQL.Database(buffer)
    } catch (readErr) {
      console.error('[Database] Failed to read existing database, creating fresh:', readErr)
      db = new SQL.Database()
      saveDb()
    }
  }

  if (!db) {
    db = new SQL.Database()
    saveDb()
  }

  db.run('PRAGMA foreign_keys = ON')
  wrappedDb = wrapDb()
  runMigrations()
  saveDb()
}

function runMigrations(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      category TEXT DEFAULT '',
      image_path TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      pieces_per_case INTEGER DEFAULT 1
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL,
      vat TEXT DEFAULT '',
      iban TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS listini (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      commission_percent REAL NOT NULL DEFAULT 0,
      payment_terms TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS listino_prices (
      product_id INTEGER NOT NULL,
      listino_id INTEGER NOT NULL,
      price REAL NOT NULL,
      PRIMARY KEY (product_id, listino_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (listino_id) REFERENCES listini(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS commission_exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listino_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      commission_percent REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (listino_id) REFERENCES listini(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS product_commission_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listino_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      commission_percent REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(listino_id, product_id),
      FOREIGN KEY (listino_id) REFERENCES listini(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      customer_id INTEGER,
      business_name TEXT NOT NULL,
      vat TEXT DEFAULT '',
      iban TEXT DEFAULT '',
      invoice_date TEXT NOT NULL,
      payment_terms TEXT NOT NULL DEFAULT '30',
      total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  // Schema updates for payments (migration 0005)
  const userColsResult = db.exec('PRAGMA table_info(users)')
  const userCols = userColsResult[0]?.values?.map((v: any[]) => v[1]) || []
  if (!userCols.includes('role')) {
    db.run(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'rep'`)
  }
  const orderColsResult = db.exec('PRAGMA table_info(orders)')
  const orderCols = orderColsResult[0]?.values?.map((v: any[]) => v[1]) || []
  if (!orderCols.includes('payment_type')) {
    db.run(`ALTER TABLE orders ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'dilazionato'`)
    db.run(`ALTER TABLE orders ADD COLUMN payment_days INTEGER DEFAULT 30`)
    db.run(`ALTER TABLE orders ADD COLUMN deposit_percent REAL DEFAULT 0`)
    db.run(`ALTER TABLE orders ADD COLUMN balance_days INTEGER DEFAULT 30`)
    db.run(`ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'`)
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT,
      paid_date TEXT,
      paid_amount REAL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'pagamento',
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS order_shared_reps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(order_id, user_id),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  db.run(`UPDATE users SET role = 'admin' WHERE id = 1`)

  // Purge configuration and task queue (migration 0007)
  db.run(`
    CREATE TABLE IF NOT EXISTS purge_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS purge_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'pending',
      order_ids TEXT NOT NULL,
      total_orders INTEGER NOT NULL DEFAULT 0,
      exported_file TEXT DEFAULT '',
      error TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT DEFAULT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS purge_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      purged_orders INTEGER NOT NULL DEFAULT 0,
      exported_file TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Insert default purge config if missing
  const existing = db.exec("SELECT value FROM purge_config WHERE key = 'auto_purge_enabled'")
  if (!existing || existing.length === 0 || (existing[0]?.values?.length ?? 0) === 0) {
    db.run("INSERT OR IGNORE INTO purge_config (key, value) VALUES ('auto_purge_enabled', 'false')")
    db.run("INSERT OR IGNORE INTO purge_config (key, value) VALUES ('purge_days_threshold', '90')")
    saveDb()
  }

  // Schema updates for product commission overrides (migration 0006)
  db.run(`
    CREATE TABLE IF NOT EXISTS product_commission_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listino_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      commission_percent REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(listino_id, product_id),
      FOREIGN KEY (listino_id) REFERENCES listini(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  // Migration: add pieces_per_case to products if missing
  const prodColsResult = db.exec('PRAGMA table_info(products)')
  const prodCols = prodColsResult[0]?.values?.map((v: any[]) => v[1]) || []
  if (!prodCols.includes('pieces_per_case')) {
    db.run(`ALTER TABLE products ADD COLUMN pieces_per_case INTEGER DEFAULT 1`)
  }

  // Migration: add pieces_per_case to order_items if missing
  const oiColsResult = db.exec('PRAGMA table_info(order_items)')
  const oiCols = oiColsResult[0]?.values?.map((v: any[]) => v[1]) || []
  if (!oiCols.includes('pieces_per_case')) {
    db.run(`ALTER TABLE order_items ADD COLUMN pieces_per_case INTEGER DEFAULT 1`)
  }

  // Migration: add delivered_date, paid_date to orders if missing
  const orderColsResult2 = db.exec('PRAGMA table_info(orders)')
  const orderCols2 = orderColsResult2[0]?.values?.map((v: any[]) => v[1]) || []
  if (!orderCols2.includes('delivered_date')) {
    db.run(`ALTER TABLE orders ADD COLUMN delivered_date TEXT DEFAULT NULL`)
  }
  if (!orderCols2.includes('paid_date')) {
    db.run(`ALTER TABLE orders ADD COLUMN paid_date TEXT DEFAULT NULL`)
  }

  const count = db.exec('SELECT COUNT(*) as cnt FROM users')
  const userCount = count?.[0]?.values?.[0]?.[0] ?? 0
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10)
    const stmt = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)')
    stmt.bind(['admin', hash, 'Amministratore', 'admin'])
    stmt.step()
    stmt.free()
  } else {
    // Ensure at least one admin exists
    db.run(`UPDATE users SET role = 'admin' WHERE username = 'admin'`)
  }

  // Seed default listini if missing
  const listiniCount = db.exec('SELECT COUNT(*) as cnt FROM listini')
  const lc = listiniCount?.[0]?.values?.[0]?.[0] ?? 0
  if (lc === 0) {
    const now = new Date().toISOString()
    db.run(`INSERT INTO listini (name, commission_percent, payment_terms, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`,
      ['Listino Dettaglio', 15, '30 giorni', 1, now])
    db.run(`INSERT INTO listini (name, commission_percent, payment_terms, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`,
      ['Listino Horeca', 12, '60 giorni', 2, now])
    db.run(`INSERT INTO listini (name, commission_percent, payment_terms, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`,
      ['Listino Ingrosso', 10, '90 giorni', 3, now])
  }

  // Seed categorie predefinite se mancanti
  const catCountRes = db.exec('SELECT COUNT(*) as cnt FROM categories')
  const catCnt = catCountRes?.[0]?.values?.[0]?.[0] ?? 0
  if (catCnt === 0) {
    const cats: [string, number][] = [
      ['vino bianco', 1],
      ['vino rosso', 2],
      ['prosecco', 3],
      ['birre', 4],
      ['distillati', 5],
      ['extra', 6],
    ]
    for (const [name, order] of cats) {
      db.run(`INSERT OR IGNORE INTO categories (name, sort_order) VALUES (?, ?)`, [name, order])
    }
  }

  // Catalogo: ripristino automatico se vuoto o contiene solo prodotto fake AAA
  // Questo sistema risolve il caso "catalogo vuoto / solo AAA" senza toccare ordini/clienti.
  seedCatalogIfNeeded()
}

function seedCatalogIfNeeded(): void {
  try {
    const prodCountRes = db.exec('SELECT COUNT(*) as cnt FROM products')
    const prodCnt = Number(prodCountRes?.[0]?.values?.[0]?.[0] ?? 0)

    // Se il catalogo ha già >= 35 prodotti reali, non fare nulla
    if (prodCnt >= 35) {
      // Ma verifica che non sia stato corrotto (es. tutti AAA)
      const realCountRes = db.exec("SELECT COUNT(*) as cnt FROM products WHERE name != 'AAA' AND name != ''")
      const realCnt = Number(realCountRes?.[0]?.values?.[0]?.[0] ?? 0)
      if (realCnt >= 35) return
    }

    // Se c'è solo AAA o catalogo quasi vuoto, fai reseed completo
    const hasOnlyAAA = prodCnt > 0 && prodCnt < 5
    if (prodCnt !== 0 && !hasOnlyAAA && Number(prodCnt) >= 10) return

    console.log('[Database] Catalogo vuoto/incompleto rilevato (' + prodCnt + ' prodotti) -> ripristino catalogo completo 35 prodotti')

    // Rimuovi eventuale prodotto fake AAA e catalogo incompleto
    db.run("DELETE FROM listino_prices WHERE product_id IN (SELECT id FROM products WHERE name = 'AAA')")
    db.run("DELETE FROM product_commission_overrides WHERE product_id IN (SELECT id FROM products WHERE name = 'AAA')")
    db.run("DELETE FROM order_items WHERE product_id IN (SELECT id FROM products WHERE name = 'AAA')")
    db.run("DELETE FROM products WHERE name = 'AAA'")

    // Se comunque meno di 35 prodotti reali, ricostruisci tutto (svuota solo se serve)
    const afterAAARes = db.exec('SELECT COUNT(*) as cnt FROM products')
    const afterAAA = Number(afterAAARes?.[0]?.values?.[0]?.[0] ?? 0)
    if (afterAAA > 0 && afterAAA >= 35) return
    if (afterAAA > 0 && afterAAA >= 10) {
      // Catalogo parziale ma non fake: non distruggere, completa solo i mancanti
      // -> inserisci con OR IGNORE i prodotti mancanti per id
    } else if (afterAAA === 0) {
      // catalogo vuoto -> reset autoincrement per ripartire da 1
      try { db.run("DELETE FROM sqlite_sequence WHERE name='products'") } catch {}
    }

    const productsSeed: [number, string, string, number, string, string][] = [
      [1, 'Pecorino', 'Vino bianco Foglia d\'Oro', 6.80, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg'],
      [2, 'Passerina', 'Vino bianco Foglia d\'Oro', 6.80, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/passerina.jpg'],
      [3, 'Chardonnay', 'Vino bianco Foglia d\'Oro', 6.50, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/chardonnay.jpg'],
      [4, 'Falanghina IGP', 'Vino bianco Foglia d\'Oro', 6.20, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg'],
      [5, 'Fiano Avellino DOCG', 'Vino bianco Campano', 9.90, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg'],
      [6, 'Greco Tufo DOCG', 'Vino bianco Campano', 9.90, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg'],
      [7, 'Lacryma Christi DOCG', 'Vino bianco Campano', 9.90, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg'],
      [8, 'Solo Paga Bianco', 'Vino bianco Campano', 4.90, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg'],
      [9, 'Falanghina IGP Premium', 'Vino bianco Campano', 4.70, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg'],
      [10, 'Fiano DOC', 'Vino bianco Campano', 7.30, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg'],
      [11, 'Greco DOC', 'Vino bianco Campano', 7.30, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg'],
      [12, 'Coda di Volpe DOC', 'Vino bianco Campano', 7.30, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg'],
      [13, 'Cesanese', 'Vino rosso Foglia d\'Oro', 6.80, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg'],
      [14, 'Merlot', 'Vino rosso Foglia d\'Oro', 6.50, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/merlot.jpg'],
      [15, 'Taurasi DOCG', 'Vino rosso Campano', 20.00, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg'],
      [16, 'Solo Paga Rosso', 'Vino rosso Campano', 4.90, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg'],
      [17, 'Aglianico IGP Premium', 'Vino rosso Campano', 4.70, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg'],
      [18, 'Aglianico DOC', 'Vino rosso Campano', 7.30, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg'],
      [19, 'Rosato DOC', 'Vino rosato Campano', 7.30, 'extra', 'https://www.ellyedition.com/wp-content/uploads/2026/05/merlot.jpg'],
      [20, 'Birra IPA', 'Birra artigianale', 3.50, 'birre', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Ipa.jpg'],
      [21, 'Birra Begiam', 'Birra artigianale', 3.50, 'birre', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Belgian-ale.jpg'],
      [22, 'Birra Golden', 'Birra artigianale', 3.50, 'birre', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Golden-ale.jpg'],
      [23, 'Prosecco DOC', 'Bollicine', 7.50, 'prosecco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/prosecco.jpg'],
      [24, 'Cuvee Elli Morris', 'Bollicine', 5.90, 'prosecco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/cuvee-millesimato.jpg'],
      [25, 'Cuvee Elly Rosé', 'Bollicine', 5.90, 'prosecco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/cuvee-prestige-ok.jpg'],
      [26, 'Limoncello', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/limoncello.jpg'],
      [27, 'Vodka', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Vodka.jpg'],
      [28, 'Gin', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Gin-Old.jpg'],
      [29, 'Grappa Barrique', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/grappabottiglia.jpg'],
      [30, 'Grappa Bianca', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/grappabottiglia.jpg'],
      [31, 'Amaro', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Amaro-Old.jpg'],
      [32, 'Gin Premium', 'Distillato Premium', 25.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Gin-Bottiglia.jpg'],
      [33, 'Rum Premium', 'Distillato Premium', 25.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/rum.jpg'],
      [34, 'Grappa Barrique Premium', 'Distillato Premium', 25.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/grappabottiglia.jpg'],
      [35, 'Amaro Premium', 'Distillato Premium', 25.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/amaro-bottiglia.jpg'],
    ]

    for (const [id, name, desc, price, cat, img] of productsSeed) {
      db.run(`INSERT OR IGNORE INTO products (id, name, description, price, category, image_path, active, pieces_per_case) VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
        [id, name, desc, price, cat, img])
    }
    // Riallinea autoincrement dopo INSERT OR IGNORE con id esplicito
    try { db.run("UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM products) WHERE name='products'") } catch {}

    // Listino prices completo L1/L2/L3 (da 0009)
    const pricesSeed: [number, number, number][] = [
      [1, 1, 6.80], [1, 2, 5.80], [1, 3, 3.90],
      [2, 1, 6.80], [2, 2, 5.80], [2, 3, 3.90],
      [3, 1, 6.50], [3, 2, 5.50], [3, 3, 3.90],
      [4, 1, 6.20], [4, 2, 4.90], [4, 3, 3.90],
      [5, 1, 9.90], [5, 2, 8.90], [5, 3, 8.40],
      [6, 1, 9.90], [6, 2, 8.90], [6, 3, 8.40],
      [7, 1, 9.90], [7, 2, 8.90], [7, 3, 8.40],
      [8, 1, 4.90], [8, 2, 4.30], [8, 3, 3.70],
      [9, 1, 4.70], [9, 2, 4.10], [9, 3, 3.80],
      [10, 1, 7.30], [10, 2, 6.00], [10, 3, 5.50],
      [11, 1, 7.30], [11, 2, 6.00], [11, 3, 5.50],
      [12, 1, 7.30], [12, 2, 6.00], [12, 3, 5.50],
      [13, 1, 6.80], [13, 2, 5.80], [13, 3, 3.90],
      [14, 1, 6.50], [14, 2, 5.50], [14, 3, 3.90],
      [15, 1, 20.00], [15, 2, 17.00], [15, 3, 16.00],
      [16, 1, 4.90], [16, 2, 4.30], [16, 3, 3.70],
      [17, 1, 4.70], [17, 2, 4.10], [17, 3, 3.80],
      [18, 1, 7.30], [18, 2, 6.00], [18, 3, 5.50],
      [19, 1, 7.30], [19, 2, 6.00], [19, 3, 5.50],
      [20, 1, 3.50], [20, 2, 3.00], [20, 3, 2.50],
      [21, 1, 3.50], [21, 2, 3.00], [21, 3, 2.50],
      [22, 1, 3.50], [22, 2, 3.00], [22, 3, 2.50],
      [23, 1, 7.50], [23, 2, 6.50], [23, 3, 5.50],
      [24, 1, 5.90], [24, 2, 4.90], [24, 3, 4.00],
      [25, 1, 5.90], [25, 2, 4.90], [25, 3, 4.00],
      [26, 1, 19.00], [26, 2, 17.00], [26, 3, 15.00],
      [27, 1, 19.00], [27, 2, 17.00], [27, 3, 15.00],
      [28, 1, 19.00], [28, 2, 17.00], [28, 3, 15.00],
      [29, 1, 19.00], [29, 2, 17.00], [29, 3, 15.00],
      [30, 1, 19.00], [30, 2, 17.00], [30, 3, 15.00],
      [31, 1, 19.00], [31, 2, 17.00], [31, 3, 15.00],
      [32, 1, 25.00], [32, 2, 20.00], [32, 3, 18.00],
      [33, 1, 25.00], [33, 2, 20.00], [33, 3, 18.00],
      [34, 1, 25.00], [34, 2, 20.00], [34, 3, 18.00],
      [35, 1, 25.00], [35, 2, 20.00], [35, 3, 18.00],
    ]
    for (const [pid, lid, price] of pricesSeed) {
      db.run(`INSERT OR IGNORE INTO listino_prices (product_id, listino_id, price) VALUES (?, ?, ?)`, [pid, lid, price])
    }

    console.log('[Database] Catalogo ripristinato: 35 prodotti + prezzi L1/L2/L3')
  } catch (e) {
    console.error('[Database] Errore seed catalogo:', e)
  }
}

export function getDb(): DbWrapper {
  return wrappedDb
}

export function persist(): void {
  saveDb()
}

export function closeDatabase(): void {
  if (db) {
    db.close()
  }
}
