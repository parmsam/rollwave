// One-off dev script: rasterizes src/branding/logo.svg into every PNG/ICO
// asset the app needs. Re-run with `npm run generate:icons` whenever the
// logo changes. Not part of the build — outputs are committed to public/.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = dirname(fileURLToPath(import.meta.url)) + '/..'
const logoPath = join(root, 'src/branding/logo.svg')
const iconsDir = join(root, 'public/icons')

async function main() {
  await mkdir(iconsDir, { recursive: true })
  const svg = await readFile(logoPath)

  await writeFile(join(root, 'public/favicon.svg'), svg)

  const renders: Array<{ file: string; size: number }> = [
    { file: 'icon-192.png', size: 192 },
    { file: 'icon-512.png', size: 512 },
    { file: 'icon-maskable-512.png', size: 512 },
    { file: 'apple-touch-icon.png', size: 180 },
  ]

  for (const { file, size } of renders) {
    await sharp(svg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, file))
    console.log(`wrote public/icons/${file} (${size}x${size})`)
  }

  const icoSizes = [16, 32, 48, 64]
  const icoBuffers = await Promise.all(
    icoSizes.map((size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()),
  )
  const ico = await pngToIco(icoBuffers)
  await writeFile(join(root, 'public/favicon.ico'), ico)
  console.log('wrote public/favicon.ico')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
