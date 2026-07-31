# ROLLWAVE

A futuristic BJJ round timer PWA. Preact + TypeScript + Vite + Tailwind CSS v4, deployed to GitHub Pages.

## Stack & why

- **Preact**, not React — ~3KB runtime, keeps the PWA fast to boot on mobile. Same hooks API (`preact/hooks`).
- **Tailwind v4** via `@tailwindcss/vite` — no `tailwind.config.js`; theme tokens (colors, etc.) live in the `@theme` block in `src/index.css`. Custom theme colors (`--color-accent`, `--color-rest`, `--color-warn`, ...) automatically become utilities (`bg-accent`, `text-warn`, etc.).
- **vite-plugin-pwa** (`workbox` / `generateSW` mode) — manifest + service worker generated at build time from config in `vite.config.ts`.
- **Vitest** for unit tests, `jsdom` environment (configured inline in `vite.config.ts`'s `test` block, via `defineConfig` imported from `vitest/config` — not plain `vite`, or the `test` key won't typecheck).

## Architecture

**`src/lib/timerEngine.ts`** is the whole app's brain: a pure, framework-agnostic reducer `reduceTimer(state, action, now)`. `now` is always passed in, never read internally — this is what makes it trivially testable (see `timerEngine.test.ts`) and what makes natural phase expiry and an explicit `SKIP` go through the *identical* code path.

Timing is **deadline-based**, not a decrementing counter: every phase transition sets `phaseEndsAtEpochMs = <transition time> + duration`. A `requestAnimationFrame` loop in `hooks/useTimer.ts` just recomputes `remaining = deadline - Date.now()` every frame — it can never drift, and correctly self-corrects after the tab is backgrounded/throttled for any length of time via the `catchUp()` loop, which chains through as many missed phase transitions as needed (anchoring each new deadline off the *previous* deadline, not off `now`, so wall-clock accuracy is preserved even through multiple skipped phases).

If you need to change how phases flow (e.g. add a phase), edit `nextPhaseAfter()` in `timerEngine.ts` and add engine-level tests first — `useTimer.ts` and every component downstream just reacts to whatever `reduceTimer` produces.

**`hooks/useTimer.ts`** wraps the engine: owns the rAF loop, `visibilitychange` catch-up, and — critically — keeps all side effects (audio, vibration) in `useEffect`s that diff `(phase, currentRound)`, never inside the pure reducer.

**Settings**: `hooks/useSettings.ts` composes `useLocalStorage` for the selected preset id, a **list** of user-saved custom presets (versioned envelope — see `SCHEMA_VERSION`, bump and handle migration there if `TimerConfig`'s shape ever changes), mute state, and the live-clock toggle. Built-in presets live in `src/lib/presets.ts` (`PRESETS`, 4 of them including "Open Mat"); user-created ones are named, edited in place (autosave on every Stepper/checkbox change — no separate "Save" step), and persisted indefinitely until deleted.

**Unlimited rounds**: `TimerConfig.unlimited` (used by the "Open Mat" preset and available as a checkbox on any custom preset) makes `nextPhaseAfter()` in `timerEngine.ts` loop `round → rest → round → …` forever, ignoring `rounds`. The only way out is a manual Reset. `PhaseIndicator`/`TimerDisplay` special-case `unlimited` to show "Round N · unlimited" instead of "N of rounds" + dots.

**History**: `lib/history.ts` (`SessionRecord`, `computeStats`/streak logic) + `hooks/useHistory.ts` (localStorage, capped at 200 records) + `components/StatsView.tsx`. `app.tsx` logs a session in two places: the `finished`-phase effect (full completion) and `handleReset()` (partial credit via `completedRoundsForPartialReset()` in `timerEngine.ts` — mid-`round` credits `currentRound - 1`, mid-`rest`/`finished` credits `currentRound` itself, since `rest` only ever follows a fully-finished round). The streak counter counts distinct calendar days with ≥1 logged session, and doesn't break just because *today* hasn't happened yet (see `computeStreak` in `lib/history.ts`).

## Audio

Voice cues are **pre-generated, not spoken at runtime**. Runtime `Web Speech API` was deliberately rejected — voice quality/consistency varies too much across browsers/devices. Instead:

- `src/lib/audioClips.ts` is the single source of truth: the list of clips (id + spoken text) and the id-resolution helpers (`resolveRoundClipId`, `resolveWarningClipId`, `resolveGetReadyTickClipId`).
- `scripts/generate-audio.ts` reads that same manifest and calls the OpenAI TTS API once per clip, writing `public/audio/<id>.mp3`. Run it whenever `AUDIO_CLIPS` changes:
  ```
  OPENAI_API_KEY=sk-... npm run generate:audio
  ```
  It's idempotent (skips existing files; pass `--force` to regenerate everything). **This never runs in CI** — the generated mp3s are committed, so the deployed app has zero runtime API dependency.
- `hooks/useAudioPlayer.ts` decodes all clips into `AudioBuffer`s via the Web Audio API. The `AudioContext` is created/resumed inside the Start button's click handler specifically — mobile browsers require a user gesture to unlock audio, and this is the one guaranteed gesture in the flow.
- If a clip file is missing (e.g. you haven't run `generate:audio` yet), playback for that cue just silently no-ops — the app is fully usable without any audio assets present.
- **Clips never overlap**: `playClip()` tracks the currently-playing `AudioBufferSourceNode` in a ref and `.stop()`s it before starting the next one (voice cues are sequential announcements, not a layered soundscape). Found this the hard way — the get-ready countdown's "one" was bleeding into the round-start "Go" before this fix.
- **Round-end bell**: `playBell()` in `useAudioPlayer.ts` is a synthesized 3-partial chime (Web Audio oscillators + a gain envelope, no asset file) fired in `useTimer.ts` whenever `rest` or `finished` is entered — both only ever happen right after a round ends, so no extra "did a round just end" check is needed. It's on its own gain node, not routed through the stop-previous-clip mechanism, so it layers under the voice cue instead of being cut off by it.
- **Round-end 4-3-2-1 countdown**: `resolveRoundEndTickClipId()` in `audioClips.ts` reuses the `four`/`three`/`two`/`one` clips (deliberately skips `five` — it'd double up with a custom 5s warning threshold's "5 seconds" clip). Fires alongside the existing single warningSeconds-threshold callout, not instead of it.
- **Load-race fix**: `loadAll()` bulk-fetches all ~27 clips when audio unlocks, but browsers cap concurrent per-host connections, so a clip needed a few seconds later (e.g. "Round 1") can still be mid-fetch on a slow connection. `playClip()` no longer just silently drops a cue whose buffer isn't ready — it fetches that one clip on demand and plays it the instant it decodes, so every cue eventually plays instead of some being silently dropped depending on network timing.
- **get-ready cutoff fix**: the sub-phase tick effect used to fire the tick matching the *starting* `getReadySeconds` (e.g. "three" for a 3s get-ready) in the same render pass as the transition effect's "Get ready" clip — and since `playClip` stops whatever's still playing, "Get ready" got cut off almost instantly. Fixed by only firing a tick when `secondsLeft < config.getReadySeconds` (strictly less than the starting value), reserving that first instant for "Get ready" alone.

## UI notes

- **⚠️ Preact + SVG presentation attributes**: unlike React, Preact does **not** camelCase→kebab-case SVG presentation attributes such as `strokeWidth`/`strokeDasharray`/`strokeDashoffset`/`strokeLinecap`. Writing `strokeWidth={20}` in JSX silently sets an attribute literally named `strokeWidth` on the DOM node, which the SVG renderer doesn't recognize and just ignores — no error, no warning, it just does nothing. `TimerDisplay.tsx`'s ring was broken this exact way for the entire session (the "drain" animation never actually ran) before this was caught by inspecting the live DOM's `outerHTML`, not by looking at TypeScript errors (it typechecks fine either way) or console errors (there are none). **Always use the raw kebab-case attribute name** (`stroke-width`, `stroke-dasharray`, etc.) for these on any `<circle>`/`<path>`/etc. JSX element in this codebase. If a future SVG animation "does nothing" with no visible error, check this first.
- **Timer ring**: `TimerDisplay.tsx` uses a thin static background track (6px) + a much thicker colored progress arc (20px) whose visible length drains via `stroke-dashoffset` (0 = fully visible/full ring, `CIRCUMFERENCE` = fully drained) — same convention as the iOS Clock app's countdown ring: starts as a full bold arc and empties out as the phase elapses, showing time being *lost*, not gained. The red glow/pulse (`isWarning`) is a separate layer on top, only in the last `warningSeconds`.
- **Responsive scaling**: the outer app container widens from `max-w-lg` to `max-w-4xl` once a session is running (`app.tsx`), and `TimerDisplay`'s size uses `vmin`-based fluid widths (`w-[min(78vmin,22rem)]` etc.) rather than fixed breakpoint caps, so the ring actually grows to fill a laptop/iPad screen (especially noticeable in the Fullscreen toggle) instead of staying phone-sized. The setup screen stays narrow regardless, since `PresetPicker`'s own `max-w-sm` caps it independent of the outer container.
- **Button press feedback**: every interactive element uses a visible `active:` background/border color fill (e.g. `active:bg-accent/20 active:border-accent/60 active:text-round`), not just `active:scale-95` alone — a scale-only press state was reported as too subtle to notice. Destructive actions (delete a custom preset, clear history) use `warn`-colored fill instead of `accent`.
- Header icons (`FullscreenToggle`, `GitHubLink`, `VolumeToggle`, history toggle, optional `LiveClock`) live inline in `app.tsx`'s header row — `FullscreenToggle` is feature-detected (`useFullscreen.ts`) and only renders when the Fullscreen API is available. Clicking the ROLLWAVE logo/title returns to the setup view (harmless no-op while a session is running, since the running view doesn't depend on that state).

## Icons / branding

`src/branding/logo.svg` is the single source design file (ring + wave motif). `scripts/generate-icons.ts` rasterizes it (via `sharp` + `png-to-ico`) into every PNG size the manifest/`index.html` needs plus `favicon.ico`. Re-run after editing the logo:
```
npm run generate:icons
```

## GitHub Pages deployment

- `vite.config.ts` sets `base: '/rollwave/'` — **must exactly match the repo name** (`parmsam/rollwave`), since this is a project site (`https://parmsam.github.io/rollwave/`), not a user/org root site. If the repo is ever renamed, update `base` and redeploy.
- Any hardcoded root-relative asset path in a component (e.g. an `<img src="/icons/...">`) will 404 under a base path — always prefix with `import.meta.env.BASE_URL` (see `app.tsx`'s header logo, or `clipUrl()` in `audioClips.ts`). `index.html`'s own `<link>`/`<script>` tags are auto-rewritten by Vite; JS string literals are not.
- `.github/workflows/deploy.yml` builds on every push to `main` and deploys via `actions/upload-pages-artifact` + `actions/deploy-pages` — no secrets required (audio is pre-baked, not generated in CI).
- One manual one-time setting: repo **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.

## Commands

```
npm run dev              # local dev server
npm run build             # typecheck + production build
npm test                  # vitest (single run)
npm run test:watch        # vitest watch mode
npm run generate:audio     # regenerate public/audio/*.mp3 (needs OPENAI_API_KEY)
npm run generate:icons     # regenerate public/icons/*, favicon.ico, favicon.svg from src/branding/logo.svg
```

## Known npm audit findings

`npm audit` flags a high-severity DoS advisory in `brace-expansion`, pulled in transitively through `vite-plugin-pwa` → `workbox-build`. It's a dev-only build-time dependency (not shipped to the deployed app) and fixing it requires a breaking `vite-plugin-pwa` major bump — left as-is; revisit if `vite-plugin-pwa` ships a non-breaking fix.
