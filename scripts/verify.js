#!/usr/bin/env node
/**
 * Provider health check.
 *
 * Loads each enabled provider from manifest.json inside a sandbox that looks
 * like the Nuvio runtime (no Node `Buffer`/`process`, `require` limited to the
 * modules the app provides), calls getStreams() for a few known titles, then
 * checks that every returned stream really plays: HLS playlists are parsed and
 * a media segment is downloaded, direct files must answer with video bytes.
 *
 * Usage:
 *   node scripts/verify.js                    # report only
 *   node scripts/verify.js vidrock castle     # only these providers
 *   node scripts/verify.js --write            # set enabled:false in manifest.json for providers with no playable stream
 *   node scripts/verify.js --all              # include providers that are already disabled
 *
 * In proxied environments run with NODE_USE_ENV_PROXY=1 so Node's fetch uses the proxy.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'manifest.json');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const ALL = args.includes('--all');
const VERBOSE = args.includes('--verbose');
const only = args.filter(a => !a.startsWith('--'));

const TITLES = {
    movie: [['603', 'movie'], ['27205', 'movie']],
    tv: [['1396', 'tv', 1, 1], ['1429', 'tv', 1, 1]],
};
// Providers that only carry certain content are tested with titles they can actually have.
const ANIME = { movie: [['372058', 'movie'], ['129', 'movie']], tv: [['85937', 'tv', 1, 1], ['95479', 'tv', 1, 1]] };
const KDRAMA = { movie: [], tv: [['93405', 'tv', 1, 1], ['197067', 'tv', 1, 1]] };
const TITLES_BY_PROVIDER = {
    animeheaven: ANIME, reanime: ANIME, animepahe: ANIME, hianime: ANIME, anizone: ANIME, animekai: ANIME, 'vidnest-anime': ANIME,
};
const GET_STREAMS_TIMEOUT = 60000;
const MAX_STREAMS_CHECKED = 12;
const SLOW_MS = 20000; // a provider slower than this feels broken in the app
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';

// ---------- sandboxed provider loading ----------
const APP_MODULES = {
    'cheerio-without-node-native': () => require('cheerio-without-node-native'),
    'react-native-cheerio': () => require('cheerio-without-node-native'),
    cheerio: () => require('cheerio-without-node-native'),
    'crypto-js': () => require('crypto-js'),
};

function loadProvider(file) {
    const code = fs.readFileSync(file, 'utf8');
    const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
    const sandbox = {
        console: quiet, fetch, URL, URLSearchParams, TextEncoder, TextDecoder, AbortController, AbortSignal,
        Headers, FormData, Blob, atob, btoa, setTimeout, clearTimeout, setInterval, clearInterval,
        Promise, JSON, Math, Date, RegExp, Map, Set, WeakMap, Symbol, Uint8Array, ArrayBuffer, DataView,
        encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, escape, unescape, parseInt, parseFloat,
        // intentionally absent (not available in React Native): Buffer, process
    };
    sandbox.globalThis = sandbox; sandbox.global = sandbox; sandbox.self = sandbox;
    const mod = { exports: {} };
    const req = name => {
        if (APP_MODULES[name]) return APP_MODULES[name]();
        throw new Error(`module '${name}' is not provided by the Nuvio app`);
    };
    vm.createContext(sandbox);
    vm.runInContext(`(function (module, exports, require) {${code}\n})`, sandbox, { filename: file })(mod, mod.exports, req);
    if (typeof mod.exports.getStreams !== 'function') throw new Error('does not export getStreams');
    return mod.exports.getStreams;
}

// ---------- stream verification ----------
const T = ms => AbortSignal.timeout(ms);

async function checkStream(st) {
    const headers = Object.assign({ 'User-Agent': UA }, st.headers || {});
    const res = { url: String(st.url || ''), label: st.quality || st.name || '', ok: false, why: '', info: '' };
    if (!/^https?:\/\//.test(res.url)) return { ...res, why: 'not an http(s) url' };
    try {
        if (/\.m3u8/i.test(res.url) || st.type === 'hls') {
            const r = await fetch(res.url, { headers, signal: T(15000) });
            const text = await r.text();
            if (!r.ok) return { ...res, why: `playlist HTTP ${r.status}` };
            if (!text.includes('#EXTM3U')) return { ...res, why: 'not an HLS playlist' };
            const variants = [...text.matchAll(/BANDWIDTH=(\d+)(?:[^\n]*?RESOLUTION=(\d+x\d+))?/g)];
            res.info = variants.map(m => `${m[2] || '?'}@${Math.round(m[1] / 1000)}k`).slice(0, 4).join(',');
            let media = text;
            let base = res.url;
            if (variants.length) {
                // master playlist: follow the highest-bandwidth variant
                const lines = text.split('\n').map(l => l.trim());
                let best = null, bw = -1;
                lines.forEach((l, i) => {
                    const m = l.match(/^#EXT-X-STREAM-INF:.*BANDWIDTH=(\d+)/);
                    if (m && +m[1] > bw && lines[i + 1] && !lines[i + 1].startsWith('#')) { bw = +m[1]; best = lines[i + 1]; }
                });
                base = new URL(best, res.url).href;
                const r2 = await fetch(base, { headers, signal: T(15000) });
                if (!r2.ok) return { ...res, why: `variant playlist HTTP ${r2.status}` };
                media = await r2.text();
            }
            const seg = media.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#'));
            if (!seg) return { ...res, why: 'playlist has no segments' };
            const segUrl = new URL(seg, base).href;
            const rs = await fetch(segUrl, { headers: { ...headers, Range: 'bytes=0-262143' }, signal: T(25000) });
            const bytes = (await rs.arrayBuffer()).byteLength;
            if (!rs.ok || bytes < 1000) return { ...res, why: `segment HTTP ${rs.status} (${bytes}B)` };
            return { ...res, ok: true, why: `HLS ok, segment ${bytes}B` };
        }
        const r = await fetch(res.url, { headers: { ...headers, Range: 'bytes=0-1023' }, signal: T(20000) });
        const ct = r.headers.get('content-type') || '';
        const buf = new Uint8Array(await r.arrayBuffer());
        const mp4 = buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
        const mkv = buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
        if (!r.ok) return { ...res, why: `HTTP ${r.status}` };
        if (!(mp4 || mkv || /^video\//i.test(ct))) return { ...res, why: `not video (${ct || 'no content-type'})` };
        const size = (r.headers.get('content-range') || '').split('/')[1];
        return { ...res, ok: true, why: `direct ${mkv ? 'mkv' : mp4 ? 'mp4' : ct}`, info: size ? `${(size / 1e9).toFixed(2)}GB` : '' };
    } catch (e) {
        return { ...res, why: 'error: ' + ((e.cause && (e.cause.code || e.cause.message)) || e.message) };
    }
}

async function runTitle(getStreams, spec) {
    const [id, type, s, e] = spec;
    let streams;
    const t0 = Date.now();
    try {
        streams = await Promise.race([
            getStreams(id, type, s, e),
            new Promise((_, rej) => setTimeout(() => rej(new Error('getStreams timed out')), GET_STREAMS_TIMEOUT)),
        ]);
    } catch (err) { return { spec, error: err.message, streams: 0, checked: [], ms: Date.now() - t0 }; }
    const ms = Date.now() - t0;
    if (!Array.isArray(streams)) return { spec, error: 'getStreams did not return an array', streams: 0, checked: [], ms };
    // check a spread of qualities rather than just the first few
    const checked = await Promise.all(streams.slice(0, MAX_STREAMS_CHECKED).map(checkStream));
    return { spec, streams: streams.length, checked, ms, qualities: streams.map(x => x.quality) };
}

(async () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    let list = manifest.scrapers.filter(s => (ALL || s.enabled !== false) && (!only.length || only.includes(s.id)));
    const verdicts = [];
    for (const sc of list) {
        const types = sc.supportedTypes || ['movie', 'tv'];
        const out = { id: sc.id, results: [], playable: 0, loadError: null };
        let getStreams;
        try { getStreams = loadProvider(path.join(ROOT, sc.filename)); }
        catch (e) { out.loadError = e.message; verdicts.push(out); console.log(`✗ ${sc.id}: load error: ${e.message}`); continue; }
        for (const type of types) {
            for (const spec of (TITLES_BY_PROVIDER[sc.id] || TITLES)[type] || []) {
                const r = await runTitle(getStreams, spec);
                out.results.push({ type, ...r });
                out.playable += r.checked.filter(c => c.ok).length;
                if (r.checked.some(c => c.ok)) break; // this type is proven; skip the second title
            }
        }
        verdicts.push(out);
        const typeLine = types.map(t => {
            const rs = out.results.filter(r => r.type === t);
            const okc = rs.reduce((n, r) => n + r.checked.filter(c => c.ok).length, 0);
            const tot = rs.reduce((n, r) => n + r.checked.length, 0);
            return `${t} ${okc}/${tot}`;
        }).join('  ');
        const totalChecked = out.results.reduce((n, r) => n + r.checked.length, 0);
        const slowest = Math.max(0, ...out.results.map(r => r.ms || 0));
        out.dead = totalChecked - out.playable;
        out.slow = slowest > SLOW_MS;
        const flag = !out.playable ? '✗' : (out.dead || out.slow) ? '~' : '✓';
        console.log(`${flag} ${sc.id.padEnd(14)} playable/returned: ${typeLine}   slowest getStreams: ${(slowest / 1000).toFixed(1)}s${out.dead ? '   (' + out.dead + ' dead links returned)' : ''}${out.slow ? '   SLOW' : ''}`);
        out.results.forEach(r => {
            if (r.error) console.log(`    ${r.type} ${r.spec[0]}: ${r.error}`);
            else console.log(`    ${r.type} ${r.spec[0]}: ${r.streams} streams in ${(r.ms / 1000).toFixed(1)}s [${(r.qualities || []).join(',')}]`);
            r.checked.forEach(c => { if (!c.ok || VERBOSE) console.log(`      ${c.ok ? 'ok ' : 'bad'} ${String(c.label).padEnd(9)} ${c.why}${c.info ? ' [' + c.info + ']' : ''}  ${c.url.slice(0, 60)}`); });
        });
    }
    const bad = verdicts.filter(v => !v.playable);
    const leaky = verdicts.filter(v => v.playable && (v.dead || v.slow));
    console.log(`\n${verdicts.length - bad.length}/${verdicts.length} providers returned at least one playable stream`);
    if (leaky.length) console.log('Returned dead links or too slow (~): ' + leaky.map(v => v.id).join(', '));
    if (bad.length) console.log('No playable stream: ' + bad.map(v => v.id).join(', '));
    if (WRITE && bad.length) {
        const ids = new Set(bad.map(v => v.id));
        manifest.scrapers.forEach(s => { if (ids.has(s.id)) s.enabled = false; });
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
        console.log(`manifest.json updated: disabled ${bad.length} provider(s)`);
    }
    process.exit(0);
})();
