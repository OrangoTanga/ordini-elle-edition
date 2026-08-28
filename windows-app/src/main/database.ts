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
          saveDb()
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
      saveDb()
    },

    run(sql: string): void {
      db.run(sql)
      saveDb()
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
    const stmt = db.prepare('INSERT INTO users (username, password, name) VALUES (?, ?, ?)')
    stmt.bind(['admin', hash, 'Amministratore'])
    stmt.step()
    stmt.free()
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
}

export function getDb(): DbWrapper {
  return wrappedDb
}

export function closeDatabase(): void {
  if (db) {
    db.close()
  }
}
