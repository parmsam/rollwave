<p align="center">
  <img src="public/icons/icon-512.png" width="120" alt="ROLLWAVE logo" />
</p>

<h1 align="center">ROLLWAVE</h1>
<p align="center">A futuristic round timer for BJJ training, drilling, and competition.</p>

<p align="center">
  <img src="docs/screenshot-setup.png" width="260" alt="ROLLWAVE preset picker" />
  <img src="docs/screenshot-running.png" width="260" alt="ROLLWAVE timer running" />
</p>

## Features

- **Presets** for Competition, Drilling, and Flow Rolling, plus a fully custom mode (rounds, round length, rest length, get-ready countdown, warning threshold)
- **Drift-free timer engine** — stays accurate even if the tab is backgrounded or the phone sleeps mid-round
- **Voice cues** ("Round 1", "Go", "Rest", countdown warnings, "Session complete") played from pre-generated audio clips — no janky in-browser text-to-speech, works identically on every device
- **Wake Lock** keeps the screen on during a session; **vibration** pulses on phase changes (Android)
- **Keyboard shortcuts** for laptop use — `space` start/pause, `r` reset, `s` / `→` skip
- **Installable PWA** — works offline, installs to your home screen on iOS/Android/desktop
- Accessible: ARIA live region announces phase changes for screen readers

## Development

```bash
npm install
npm run dev
```

```bash
npm test           # run the timer engine's unit tests
npm run build      # typecheck + production build
npm run preview    # serve the production build locally
```

### Regenerating assets

Voice clips and icons are pre-generated and committed — the deployed app never calls any external API. To regenerate them after changing the clip manifest or the logo:

```bash
OPENAI_API_KEY=sk-... npm run generate:audio   # public/audio/*.mp3
npm run generate:icons                         # public/icons/*, favicon.ico
```

See [`CLAUDE.md`](./CLAUDE.md) for architecture notes and more detail.

## Deployment

Pushes to `main` build and deploy automatically to GitHub Pages via `.github/workflows/deploy.yml`.

## Credits

Inspired by [bjj-timer.com](https://bjj-timer.com) ([source](https://github.com/sfw185/BJJTimer)) and [bjjchat.com](https://bjjchat.com/tools/round-timer)'s round timer tools.
