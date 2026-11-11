# Comprends-les ! 🇫🇷👂

A tiny, offline-friendly app for practising **listening** to French numbers — especially the
dreaded 70–99 (*soixante-dix-sept*, *quatre-vingt-dix-neuf*…).

It's a Progressive Web App: open it in Chrome on Android and choose **Add to Home screen** /
**Install app**. Speech uses your device's built-in French voice, so there's no AI model and no
server.

## Modes

| Mode | Status |
|---|---|
| 📞 Phone numbers: step by step (one pair at a time) or the whole number | ✅ |
| 💶 Money | planned |
| 🚆 Railway announcements (train numbers, times, platforms) | planned |
| 📐 Measurements (m, cm, m², scales like 1:50) | planned |

Settings: speech speed, how much extra 70–99 practice you get, and a France / Belgium / Switzerland
toggle (*septante, huitante, nonante*). Pairs you miss come back more often.

## Getting a French voice on Android (for offline use)

Settings → System → Languages → Text-to-speech output → Google speech engine ⚙️ →
Install voice data → **Français (France)**.

## Development

```bash
npm install
npm run dev      # local dev server (also reachable from your phone on the same Wi-Fi)
npm test         # number-to-French rules + phone mode tests
npm run build    # static site in dist/
```

`src/french.ts` turns numbers into words using fixed rules (traditional spelling), so the text is
always correct. `.github/workflows/pages.yml` deploys to GitHub Pages on every push to `main`.
