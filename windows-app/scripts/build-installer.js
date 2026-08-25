/**
 * Build script for Windows installer via electron-builder.
 *
 * Usage:
 *   node scripts/build-installer.js              # full installer (needs wine on macOS)
 *   node scripts/build-installer.js --portable    # portable .exe (no installer)
 *   node scripts/build-installer.js --dir         # unpacked dir (fastest, for testing)
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const isPortable = args.includes('--portable')
const isDir = args.includes('--dir')

// Step 1: Build the app (TypeScript main + Vite renderer)
console.log('\n[1/3] Building app...')
execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') })

// Step 2: Generate icons if missing
const icoPath = path.join(__dirname, '..', 'assets', 'icon.ico')
if (!fs.existsSync(icoPath)) {
  console.log('\n[2/3] Generating icon...')
  execSync('node scripts/generate-icons.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
} else {
  console.log('\n[2/3] Icon already exists, skipping...')
}

// Step 3: Package with electron-builder
console.log('\n[3/3] Packaging...')
// Force x64 unless --arm64 is explicitly requested.
// Without this, electron-builder defaults to the build machine's arch
// (Apple Silicon → ARM64), producing an installer that cannot run on
// standard x64 Windows PCs.
const isArm64 = args.includes('--arm64')
const flags = []
if (isPortable) flags.push('--win=portable')
else if (isDir) flags.push('--win=dir')
else flags.push('--win=nsis')
flags.push(isArm64 ? '--arm64' : '--x64')

const cmd = `npx electron-builder ${flags.join(' ')}`
console.log(`  Running: ${cmd}`)
execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') })

console.log('\nDone! Output in release/')
