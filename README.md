# Nuvio Providers

A small, curated set of streaming providers for the [Nuvio](https://github.com/tapframe/NuvioStreaming) app. Every provider here is tested against the real site, and every stream it returns is checked on the user's own network before it reaches the app, so dead links never show up in the list.

📖 Developer guide: [DOCUMENTATION.md](DOCUMENTATION.md)

## Quick Start

1. Open **Nuvio** > **Settings** > **Plugins**
2. Add this repository URL:
   ```
   https://raw.githubusercontent.com/yellowcateyes/nuvio-providers/refs/heads/main
   ```
3. Refresh and enable the providers you want

---

## Providers

| Provider | Content | Quality | Notes |
|---|---|---|---|
| **vidfast** | Movies, TV | Up to 2160p (HLS ladder: 2160/1080/720/480) | English subtitles. Needs enc-dec.app. |
| **vaplayer** | Movies | 1080p HLS | No TV. |
| **castle** | Movies, TV, K-dramas | 720p | Many subtitle languages, one stream per title. |
| **anizone** | Anime | 1080p HLS | Japanese + English audio tracks, ASS subtitles. |
| **animeheaven** | Anime | 720p MP4 | Japanese audio, soft English subtitles. |
| **kisskh** | K-dramas / Asian dramas | HLS | English subtitles. Needs enc-dec.app. |

Anime providers map TMDB seasons to the site's own entries (arcs, split cours, absolute numbering). When the mapping is not certain they return nothing rather than the wrong episode.

---

## How streams are checked

Providers wrap their scraper (`src/<id>/core.js`) with `src/_shared/validate.js`. Before returning, it:

- probes every stream (HLS: playlist, variant and first segment; direct files: the first bytes must be video)
- drops dead links, web pages and expired URLs, and removes duplicates
- fills in the real quality from the playlist when the site does not say
- sorts best quality first, then fastest to respond
- drops movie results whose file name names a different release year (sequels), and Indian-language releases

It never throws: if validation itself fails, the original list is returned.

---

## Testing

```bash
npm install
npm run build                       # bundle src/<id>/ into providers/<id>.js
npm run verify                      # test every enabled provider
npm run verify -- castle vidfast    # test specific providers
npm run verify -- --verbose         # also list the streams that passed
npm run verify -- --write           # disable providers with no playable stream in manifest.json
```

`verify` loads each provider in a sandbox that looks like the Nuvio runtime (no Node `Buffer`/`process`, only `fetch` and the modules the app provides), calls `getStreams` for sample titles, and checks that the returned streams really play. It reports how many returned links work and how long `getStreams` took, and flags providers that return dead links or take longer than 20 seconds.

Some networks are blocked by the streaming sites. If a provider fails for you, run the **Verify providers** workflow from the repository's **Actions** tab (optionally listing provider names) to test from GitHub's network instead.

To read real video stats (codec, resolution, bitrate, duration, test decode) with ffprobe/ffmpeg and to catch wrong-title results by comparing runtime and year with TMDB:

```bash
node scripts/probe-quality.js <provider> <tmdbId> <movie|tv> [season] [episode] [--decode] [--max=N]
node scripts/probe-quality.js vidfast 872585 movie --decode      # Oppenheimer
node scripts/probe-quality.js anizone 85937 tv 1 1               # Demon Slayer S1E1
```

In sandboxes that use an HTTPS proxy, run Node with `NODE_USE_ENV_PROXY=1` so `fetch` uses it.

---

## Project Structure

```
nuvio-providers/
├── src/
│   ├── _shared/validate.js     # Stream validation shared by all providers
│   ├── vidfast/                # core.js = scraper, index.js = scraper + validation
│   ├── vaplayer/
│   ├── castle/
│   ├── anizone/
│   ├── animeheaven/
│   └── kisskh/
├── providers/                  # Built files the app loads (generated, do not edit)
├── scripts/
│   ├── verify.js               # Provider health check
│   ├── probe-quality.js        # ffprobe-based quality/title check
│   └── test-kisskh-mock.js     # KissKH logic test against a mocked API
├── .github/workflows/verify.yml
├── manifest.json               # Provider registry
├── build.js                    # Build script
└── DOCUMENTATION.md
```

---

## Adding a Provider

1. Create `src/<id>/core.js` that exports `getStreams(tmdbId, mediaType, season, episode)` and returns an array of stream objects (format below).
2. Create `src/<id>/index.js` that runs the results through the validator:
   ```javascript
   const { getStreams: scrape } = require('./core.js');
   const { validateStreams } = require('../_shared/validate.js');

   function getStreams(tmdbId, mediaType, season, episode) {
     return Promise.resolve(scrape(tmdbId, mediaType, season, episode)).then(validateStreams);
   }

   module.exports = { getStreams };
   ```
3. Build it: `node build.js <id>` (this writes `providers/<id>.js`).
4. Register it in `manifest.json`:
   ```json
   {
     "id": "myprovider",
     "name": "My Provider",
     "filename": "providers/myprovider.js",
     "supportedTypes": ["movie", "tv"],
     "enabled": true
   }
   ```
5. Run `npm run verify -- myprovider` and only keep it if the streams really play.

The app's JavaScript engine (Hermes) is picky about `async/await` in dynamic code. Files under `src/` are bundled and transpiled by `build.js`, so `async/await` is fine there. Single-file providers written directly in `providers/` should use Promise chains, or be transpiled with `node build.js --transpile <file>.js`.

`node build.js` also builds every `src/` folder; folders starting with `_` are skipped. Use `npm run build:watch` to rebuild on changes.

---

## Stream Object Format

```javascript
{
  name: "Provider Name",           // Provider / server label
  title: "Movie (2023)",           // Stream description
  url: "https://...",              // Direct stream URL (m3u8, mp4, mkv)
  quality: "1080p",                // Quality label
  type: "hls",                     // Optional: "hls" when the URL is not obviously .m3u8
  size: "2.5 GB",                  // Optional file size
  headers: {                       // Optional headers needed for playback
    "Referer": "https://source.com",
    "User-Agent": "Mozilla/5.0..."
  },
  subtitles: [                     // Optional external subtitles (VTT, SRT, ASS, ...)
    { url: "https://...", language: "en", name: "English" }
  ]
}
```

---

## Local Development Server

```bash
npm run serve
```

Starts a local server that serves `manifest.json` and `providers/` so you can add it to Nuvio on your network while developing.

---

## Disclaimer

These providers only look up publicly reachable streams on third-party sites and do not host any content. Sites change without notice, so a provider that works today can stop working; run `npm run verify` to find out which.

## License

See [LICENSE](LICENSE).
