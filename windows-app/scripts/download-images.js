/**
 * Downloads product images from www.ellyedition.com
 * Maps them to app products and generates SQL migration
 * 
 * Usage: node scripts/download-images.js
 * 
 * Product image mapping:
 * Website product → App product ID(s)
 *
 * Strategy:
 * - Products with exact match on website → use their specific image
 * - Products without a website image → use closest category match
 * - All images stored as https:// URLs (worker validates http/https/data)
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const IMAGES_DIR = path.join(__dirname, '../assets/product-images')
const BASE_URL = 'https://www.ellyedition.com'

// Product images from website mapping
const PRODUCT_IMAGES = {
  // Vini Foglia d'Oro (direct matches on website)
  'Pecorino': '/wp-content/uploads/2026/05/Pecorino.jpg',
  'Passerina': '/wp-content/uploads/2026/05/passerina.jpg',
  'Chardonnay': '/wp-content/uploads/2026/05/chardonnay.jpg',
  'Falanghina': '/wp-content/uploads/2026/05/falanghina.jpg',    // used for both IGP and IGP Premium
  'Merlot': '/wp-content/uploads/2026/05/merlot.jpg',
  'Cesanese': '/wp-content/uploads/2026/05/Cesanese.jpg',

  // Vini Campani (no individual product pages → use closest wine image)
  'Fiano': '/wp-content/uploads/2026/05/Pecorino.jpg',          // generic white
  'Greco': '/wp-content/uploads/2026/05/Pecorino.jpg',
  'Lacryma': '/wp-content/uploads/2026/05/Pecorino.jpg',
  'Solo Paga Bianco': '/wp-content/uploads/2026/05/falanghina.jpg',
  'Solo Paga Rosso': '/wp-content/uploads/2026/05/Cesanese.jpg',
  'Aglianico': '/wp-content/uploads/2026/05/Cesanese.jpg',
  'Taurasi': '/wp-content/uploads/2026/05/Cesanese.jpg',
  'Coda di Volpe': '/wp-content/uploads/2026/05/falanghina.jpg',
  'Rosato': '/wp-content/uploads/2026/05/merlot.jpg',

  // Birre
  'Birra IPA': '/wp-content/uploads/2026/05/Ipa.jpg',
  'Birra Begiam': '/wp-content/uploads/2026/05/Belgian-ale.jpg',  // Belgian = Begiam
  'Birra Golden': '/wp-content/uploads/2026/05/Golden-ale.jpg',

  // Bollicine
  'Prosecco DOC': '/wp-content/uploads/2026/05/prosecco.jpg',
  'Cuvee Elli Morris': '/wp-content/uploads/2026/05/cuvee-millesimato.jpg',
  'Cuvee Elly Rosé': '/wp-content/uploads/2026/05/cuvee-prestige-ok.jpg',

  // Distillati Linea Tonda
  'Limoncello': '/wp-content/uploads/2026/05/limoncello.jpg',
  'Vodka': '/wp-content/uploads/2026/05/Vodka.jpg',
  'Gin': '/wp-content/uploads/2026/05/Gin-Old.jpg',
  'Grappa Barrique': '/wp-content/uploads/2026/05/grappabottiglia.jpg',
  'Grappa Bianca': '/wp-content/uploads/2026/05/grappabottiglia.jpg',
  'Amaro': '/wp-content/uploads/2026/05/Amaro-Old.jpg',

  // Distillati Premium
  'Gin Premium': '/wp-content/uploads/2026/05/Gin-Bottiglia.jpg',
  'Rum Premium': '/wp-content/uploads/2026/05/rum.jpg',
  'Grappa Barrique Premium': '/wp-content/uploads/2026/05/grappabottiglia.jpg',
  'Amaro Premium': '/wp-content/uploads/2026/05/amaro-bottiglia.jpg',
}

// App products with IDs
const APP_PRODUCTS = [
  // Vino Bianco (1-12)
  { id: 1, name: 'Pecorino', key: 'Pecorino' },
  { id: 2, name: 'Passerina', key: 'Passerina' },
  { id: 3, name: 'Chardonnay', key: 'Chardonnay' },
  { id: 4, name: 'Falanghina IGP', key: 'Falanghina' },
  { id: 5, name: 'Fiano Avellino DOCG', key: 'Fiano' },
  { id: 6, name: 'Greco Tufo DOCG', key: 'Greco' },
  { id: 7, name: 'Lacryma Christi DOCG', key: 'Lacryma' },
  { id: 8, name: 'Solo Paga Bianco', key: 'Solo Paga Bianco' },
  { id: 9, name: 'Falanghina IGP Premium', key: 'Falanghina' },
  { id: 10, name: 'Fiano DOC', key: 'Fiano' },
  { id: 11, name: 'Greco DOC', key: 'Greco' },
  { id: 12, name: 'Coda di Volpe DOC', key: 'Coda di Volpe' },
  // Vino Rosso (13-18)
  { id: 13, name: 'Cesanese', key: 'Cesanese' },
  { id: 14, name: 'Merlot', key: 'Merlot' },
  { id: 15, name: 'Taurasi DOCG', key: 'Taurasi' },
  { id: 16, name: 'Solo Paga Rosso', key: 'Solo Paga Rosso' },
  { id: 17, name: 'Aglianico IGP Premium', key: 'Aglianico' },
  { id: 18, name: 'Aglianico DOC', key: 'Aglianico' },
  // Extra (19)
  { id: 19, name: 'Rosato DOC', key: 'Rosato' },
  // Birre (20-22)
  { id: 20, name: 'Birra IPA', key: 'Birra IPA' },
  { id: 21, name: 'Birra Begiam', key: 'Birra Begiam' },
  { id: 22, name: 'Birra Golden', key: 'Birra Golden' },
  // Bollicine (23-25)
  { id: 23, name: 'Prosecco DOC', key: 'Prosecco DOC' },
  { id: 24, name: 'Cuvee Elli Morris', key: 'Cuvee Elli Morris' },
  { id: 25, name: 'Cuvee Elly Rosé', key: 'Cuvee Elly Rosé' },
  // Distillati Linea Tonda (26-31)
  { id: 26, name: 'Limoncello', key: 'Limoncello' },
  { id: 27, name: 'Vodka', key: 'Vodka' },
  { id: 28, name: 'Gin', key: 'Gin' },
  { id: 29, name: 'Grappa Barrique', key: 'Grappa Barrique' },
  { id: 30, name: 'Grappa Bianca', key: 'Grappa Bianca' },
  { id: 31, name: 'Amaro', key: 'Amaro' },
  // Distillati Premium (32-35)
  { id: 32, name: 'Gin Premium', key: 'Gin Premium' },
  { id: 33, name: 'Rum Premium', key: 'Rum Premium' },
  { id: 34, name: 'Grappa Barrique Premium', key: 'Grappa Barrique Premium' },
  { id: 35, name: 'Amaro Premium', key: 'Amaro Premium' },
]

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

function imageToBase64(filePath) {
  const data = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg'
  return `data:${mime};base64,${data.toString('base64')}`
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true })
  }

  // Collect unique image URLs
  const uniqueUrls = new Set(Object.values(PRODUCT_IMAGES))
  console.log(`[Download] ${uniqueUrls.size} immagini uniche da scaricare...`)

  const urlToFile = {}
  for (const url of uniqueUrls) {
    const filename = url.split('/').pop()
    const dest = path.join(IMAGES_DIR, filename)
    urlToFile[url] = dest
    if (fs.existsSync(dest)) {
      console.log(`  ∃ ${filename} (già presente)`)
    } else {
      const fullUrl = `${BASE_URL}${url}`
      console.log(`  ↓ ${filename}...`)
      try {
        await downloadImage(fullUrl, dest)
        console.log(`  ✓ ${filename}`)
      } catch (err) {
        console.error(`  ✗ ${filename}: ${err.message}`)
      }
    }
  }

  // Generate SQL migration
  console.log('\n[SQL] Generazione UPDATE statements...')
  const sqlLines = ['-- Migration 0008: Product images from ellyedition.com']
  sqlLines.push('')
  sqlLines.push("PRAGMA foreign_keys = OFF;")

  for (const product of APP_PRODUCTS) {
    const imagePath = PRODUCT_IMAGES[product.key]
    if (!imagePath) {
      console.log(`  ? ${product.name} (ID ${product.id}): nessuna immagine`)
      continue
    }
    const imageUrl = `${BASE_URL}${imagePath}`
    sqlLines.push(`UPDATE products SET image_path = '${imageUrl}' WHERE id = ${product.id};`)
  }

  sqlLines.push("PRAGMA foreign_keys = ON;")
  sqlLines.push('')
  sqlLines.push('-- End migration 0008')

  const sqlContent = sqlLines.join('\n')
  const sqlPath = path.join(__dirname, '../../worker/migrations/0008_product_images.sql')
  fs.writeFileSync(sqlPath, sqlContent)
  console.log(`[SQL] Salvato in ${sqlPath}`)
  console.log(sqlContent)
}

main().catch(console.error)
