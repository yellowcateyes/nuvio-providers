#!/usr/bin/env node
/**
 * Measures real video stats of a provider's streams with ffprobe/ffmpeg
 * (codec, resolution, fps, bitrate, duration, size) and optionally test-decodes a
 * few seconds to measure real throughput.
 *
 * Also compares each file's duration with TMDB's runtime to catch wrong-title results.
 *
 * Usage: node scripts/probe-quality.js <provider> <tmdbId> <movie|tv> [season] [episode] [--decode] [--max=N]
 * Needs ffprobe/ffmpeg on PATH. In proxied sandboxes set NODE_USE_ENV_PROXY=1.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const [name, id, type, season, episode] = args.filter(a => !a.startsWith('--'));
const DECODE = flags.includes('--decode');
const MAX = +((flags.find(f => f.startsWith('--max=')) || '--max=12').slice(6));
// ffmpeg only honours the lowercase http_proxy variable (also for https URLs)
const ENV = Object.assign({}, process.env, process.env.HTTPS_PROXY && !process.env.http_proxy ? { http_proxy: process.env.HTTPS_PROXY } : {});
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function ffArgs(st) {
    const h = Object.assign({}, st.headers || {});
    const ua = h['User-Agent'] || h['user-agent'] || UA;
    delete h['User-Agent']; delete h['user-agent'];
    const extra = Object.entries(h).map(([k, v]) => `${k}: ${v}\r\n`).join('');
    const a = ['-user_agent', ua];
    if (extra) a.push('-headers', extra);
    return a;
}

function probe(st) {
    const r = spawnSync('ffprobe', ['-v', 'error', '-rw_timeout', '20000000', ...ffArgs(st),
        '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate,bit_rate,channels:format=duration,bit_rate,size,format_name',
        '-of', 'json', st.url], { encoding: 'utf8', timeout: 60000, env: ENV });
    if (r.status !== 0) return { error: (r.stderr || r.error || 'ffprobe failed').toString().trim().split('\n').pop().replace(st.url, '<url>').slice(0, 120) };
    const j = JSON.parse(r.stdout || '{}');
    const v = (j.streams || []).find(s => s.codec_type === 'video') || {};
    const a = (j.streams || []).filter(s => s.codec_type === 'audio');
    const f = j.format || {};
    const [n, d] = String(v.avg_frame_rate || '0/1').split('/').map(Number);
    return {
        codec: v.codec_name, res: v.width ? `${v.width}x${v.height}` : '?', fps: d ? +(n / d).toFixed(2) : 0,
        kbps: Math.round((+f.bit_rate || +v.bit_rate || 0) / 1000), mins: f.duration ? Math.round(f.duration / 60) : 0,
        gb: f.size ? +(f.size / 1e9).toFixed(2) : 0, audio: a.map(x => `${x.codec_name}${x.channels ? '/' + x.channels + 'ch' : ''}`).join(','),
    };
}

function decode(st) {
    const t0 = Date.now();
    const r = spawnSync('ffmpeg', ['-v', 'error', '-rw_timeout', '20000000', ...ffArgs(st), '-t', '10', '-i', st.url, '-map', '0:v:0', '-f', 'null', '-'],
        { encoding: 'utf8', timeout: 90000, env: ENV });
    const sec = (Date.now() - t0) / 1000;
    return r.status === 0 && !r.stderr.trim()
        ? { ok: true, secFor10s: +sec.toFixed(1) }
        : { ok: false, err: (r.stderr || '').trim().split('\n')[0].slice(0, 100) || 'ffmpeg failed' };
}

const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
async function expectedInfo(tmdbId, kind, s, e) {
    // Used to catch wrong-title results: the file's duration should be close to the real runtime.
    try {
        const url = kind === 'tv' ? `https://api.themoviedb.org/3/tv/${tmdbId}/season/${s}/episode/${e}?api_key=${TMDB_KEY}`
            : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}`;
        const d = await (await fetch(url)).json();
        let year = 0;
        if (kind === 'movie') year = +(d.release_date || '0').slice(0, 4);
        else { const sh = await (await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}`)).json(); year = +(sh.first_air_date || '0').slice(0, 4); }
        return { runtime: d.runtime || 0, year, kind };
    } catch (_) { return { runtime: 0, year: 0, kind }; }
}

(async () => {
    const exp = await expectedInfo(id, type, season, episode);
    const want = exp.runtime;
    const p = require(path.join(__dirname, '..', 'providers', name + '.js'));
    const streams = await p.getStreams(id, type, season && +season, episode && +episode);
    console.log(`${name}: ${streams.length} streams\n`);
    for (const st of streams.slice(0, MAX)) {
        const s = probe(st);
        const claimed = st.quality || '?';
        let line = s.error ? `✗ ${claimed.padEnd(8)} ${s.error}`
            : `${s.res.padEnd(10)} (label ${claimed}) ${s.codec} ${s.fps}fps ${s.kbps}kbps ${s.mins}min ${s.gb}GB audio:${s.audio}`;
        if (want && s.mins) {
            const off = Math.abs(s.mins - want) / want;
            line += off > 0.04 ? `  | ⚠ runtime ${s.mins}min vs expected ${want}min` : `  | runtime ok (${want}min)`;
        }
        // movies: a year in the file name that differs from the release year means another film (sequel/remake)
        const nameYear = (String(st.title || '').match(/\b(19|20)\d{2}\b/) || [])[0];
        if (exp.kind === 'movie' && exp.year && nameYear && Math.abs(+nameYear - exp.year) > 1) line += `  | ⚠ WRONG TITLE? file says ${nameYear}, film is ${exp.year}`;
        if (DECODE && !s.error) { const d = decode(st); line += d.ok ? `  | 10s decoded in ${d.secFor10s}s` : `  | decode FAILED: ${d.err}`; }
        console.log(line);
        console.log(`    ${String(st.title || st.name).slice(0, 110)}`);
    }
    process.exit(0);
})();
