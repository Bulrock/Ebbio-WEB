# Ebbio — web

Web port of the [Ebbio](https://github.com/Bulrock/Ebbio) Flutter app: learn
words with spaced repetition, *powered by the Ebbinghaus forgetting curve*.

Pure **HTML + CSS + vanilla JS** (ES modules), no framework, no build step.
Data lives in **IndexedDB** — the browser store built for large volumes of
structured data. Installable as a **PWA** (offline-capable, add-to-home-screen).

## Features (parity with the mobile app)

- Spaced-repetition scheduler: user-editable steps (default 3 h → 3 d → 3 w →
  3 mo), *Remember* / *Forgot* with **to-start** or **one-step-back** reset.
- Multiple courses (one per target language), per-course settings.
- Add words with automatic definition (Wiktionary) + translation (MyMemory).
- Training: scheduled review (swipe / buttons) + free-practice flashcards.
- Games: match-the-pairs, quiz, reverse quiz, listening, spelling.
- Dictionary grouped by letter (collapsible), text-to-speech (Web Speech API).
- Best-effort review reminders (Notification Triggers where supported, in-tab
  timers otherwise).
- 11 UI languages (en, ru, es, de, fr, pt, it, pl, tr, zh, ja), auto or manual.

## Run locally

The app needs an `http(s)://` origin (service worker, notifications, TTS and
the Wiktionary/MyMemory `fetch` calls do not work from `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy (GitHub Pages)

Push to `main` and enable Pages (Settings → Pages → Deploy from branch →
`main` / root). The app is fully static and served from the repo root at
`https://<user>.github.io/Ebbio-WEB/`.

### Install on a phone

- **iOS (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** menu → *Install app* / *Add to Home screen*.

## Project layout

```
index.html            app shell
manifest.webmanifest  PWA manifest
sw.js                 service worker (offline cache)
css/styles.css        glassmorphism design system
js/
  app.js              bootstrap
  i18n.js, i18n_data.js  localization (generated from the Flutter ARB files)
  db.js, store.js, models.js   IndexedDB storage
  logic/              pure logic: scheduler, matching, quiz, definition parser
  services/           dictionary, translation, autofill, tts, notifications
  util/               languages, formatting
  ui/                 dom helpers, router, components, screens
```

The pure `logic/` and `services/` parsers are ported 1:1 from the Flutter app
and covered by the same behavioural expectations.
