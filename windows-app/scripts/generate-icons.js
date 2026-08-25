const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const sizes = [16, 24, 32, 48, 64, 128, 256]
const assetsDir = path.join(__dirname, '..', 'assets')
const svgPath = path.join(assetsDir, 'icon.svg')
const pngDir = path.join(assetsDir, 'png')
const icoPath = path.join(assetsDir, 'icon.ico')

if (!fs.existsSync(svgPath)) {
  console.error('SVG not found at', svgPath)
  process.exit(1)
}

fs.mkdirSync(pngDir, { recursive: true })

// Generate PNGs at each size
for (const size of sizes) {
  const out = path.join(pngDir, `${size}.png`)
  execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${out}"`, { stdio: 'pipe' })
  console.log(`  Generated ${size}x${size}`)
}

// Build .ico from PNGs
const icoHeader = Buffer.alloc(6)
icoHeader.writeUInt16LE(0, 0)     // reserved
icoHeader.writeUInt16LE(1, 2)     // type: icon
icoHeader.writeUInt16LE(sizes.length, 4)  // count

const dirEntrySize = 16
const dirEntries = []
const imageBuffers = []
let offset = 6 + sizes.length * dirEntrySize

for (const size of sizes) {
  const pngPath = path.join(pngDir, `${size}.png`)
  const pngData = fs.readFileSync(pngPath)
  imageBuffers.push(pngData)

  const entry = Buffer.alloc(dirEntrySize)
  entry.writeUInt8(size >= 256 ? 0 : size, 0)  // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1)  // height
  entry.writeUInt8(0, 2)   // colors
  entry.writeUInt8(0, 3)   // reserved
  entry.writeUInt16LE(1, 4) // planes
  entry.writeUInt16LE(32, 6) // bpp
  entry.writeUInt32LE(pngData.length, 8)  // size
  entry.writeUInt32LE(offset, 12)         // offset
  dirEntries.push(entry)
  offset += pngData.length
}

const buffers = [icoHeader, ...dirEntries, ...imageBuffers]
fs.writeFileSync(icoPath, Buffer.concat(buffers))
console.log(`  Generated icon.ico (${sizes.length} sizes)`)

// Cleanup PNG dir
fs.rmSync(pngDir, { recursive: true })

console.log('Done - icons ready at assets/')
