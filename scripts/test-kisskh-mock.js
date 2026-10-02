// Exercises the KissKH provider logic (domain fallback, title/season/year matching, kkey, subtitles) against a
// mocked kisskh API, because the real site is Cloudflare-blocked for datacenter IPs. TMDB and enc-dec.app are real.
// Run: NODE_USE_ENV_PROXY=1 node scripts/test-kisskh-mock.js
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'kisskh', 'core.js'), 'utf8');
const calls = [];
const mockFetch = async (url, opts) => {
  const u = String(url);
  if (/kisskh\.(do|co|id)/.test(u)) {
    calls.push(u.replace(/kkey=.*/, 'kkey=…'));
    const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } });
    if (u.startsWith('https://kisskh.do')) return new Response('<html>Just a moment...</html>', { status: 403 }); // first domain blocked
    if (u.includes('/api/DramaList/Search')) return json([{ id: 7, title: 'Squid Game Season 2' }, { id: 8, title: 'Squid Game: The Challenge' }, { id: 9, title: 'Squid Game' }]);
    if (u.includes('/api/DramaList/Drama/9')) return json({ title: 'Squid Game', releaseDate: '2021-09-17', episodes: Array.from({ length: 9 }, (_, i) => ({ id: 900 + i + 1, number: i + 1 })) });
    if (u.includes('/api/DramaList/Drama/7')) return json({ title: 'Squid Game Season 2', releaseDate: '2024-12-26', episodes: [{ id: 701, number: 1 }] });
    if (u.includes('/api/DramaList/Drama/8')) return json({ title: 'Squid Game: The Challenge', releaseDate: '2023', episodes: [{ id: 801, number: 1 }] });
    if (u.includes('/api/DramaList/Episode/')) return json({ Video: 'https://cdn.mock/x/master.m3u8', ThirdParty: '' });
    if (u.includes('/api/Sub/')) return json([{ src: 'https://subs.mock/en.srt', label: 'English', land: 'en' }, { src: 'https://subs.mock/enc.txt1', label: 'Korean', land: 'ko' }]);
  }
  return fetch(url, opts); // TMDB + enc-dec.app are real
};
const m = { exports: {} };
new Function('module', 'exports', 'require', 'fetch', 'console', src)(m, m.exports, require, mockFetch, { log() {}, error: console.error, warn() {} });
(async () => {
  const s1 = await m.exports.getStreams('93405', 'tv', 1, 3);
  console.log('S1E3 ->', JSON.stringify(s1.map(x => ({ t: x.title, url: x.url, subs: x.subtitles.map(y => y.url), ref: x.headers.Referer }))));
  console.log('calls:', calls.slice(0, 8).join('\n       '));
  const s2 = await m.exports.getStreams('93405', 'tv', 2, 1);
  console.log('S2E1 ->', s2.map(x => x.title));
  const s9 = await m.exports.getStreams('93405', 'tv', 1, 12);
  console.log('S1E12 (does not exist) ->', s9.length);
})();
