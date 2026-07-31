// One-off dev script: bakes every voice clip in AUDIO_CLIPS, for every
// voice in VOICE_OPTIONS, to a static mp3 via the OpenAI TTS API. Run
// manually with:
//
//   OPENAI_API_KEY=sk-... npm run generate:audio
//
// Output is committed to public/audio/<voice>/<id>.mp3 — the deployed app
// only ever plays these static files, so end users and CI never need an
// API key. Re-run (idempotent — skips existing files) whenever AUDIO_CLIPS
// or VOICE_OPTIONS changes; pass --force to regenerate everything.
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import { AUDIO_CLIPS, VOICE_OPTIONS } from '../src/lib/audioClips'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outRoot = join(root, 'public/audio')
const MODEL = 'gpt-4o-mini-tts'
const force = process.argv.includes('--force')

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY. Usage: OPENAI_API_KEY=sk-... npm run generate:audio')
    process.exit(1)
  }

  const client = new OpenAI()

  for (const voice of VOICE_OPTIONS) {
    const outDir = join(outRoot, voice.id)
    await mkdir(outDir, { recursive: true })

    for (const clip of AUDIO_CLIPS) {
      const outPath = join(outDir, `${clip.id}.mp3`)
      if (!force && existsSync(outPath)) {
        console.log(`skip  ${voice.id}/${clip.id}.mp3 (already exists)`)
        continue
      }

      const response = await client.audio.speech.create({
        model: MODEL,
        voice: voice.id,
        input: clip.text,
        response_format: 'mp3',
      })
      const buffer = Buffer.from(await response.arrayBuffer())
      await writeFile(outPath, buffer)
      console.log(`wrote ${voice.id}/${clip.id}.mp3  ("${clip.text}")`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
