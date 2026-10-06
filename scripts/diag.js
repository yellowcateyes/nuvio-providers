// Temporary diagnostics for candidate providers (run from GitHub Actions).
const crypto = require('crypto');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
const cut = (s, n) => String(s).replace(/\s+/g, ' ').slice(0, n);

async function peachify() {
  const H = { 'User-Agent': UA, Origin: 'https://peachify.top', Referer: 'https://peachify.top/' };
  const servers = [['Multi', 'multi'], ['Horizon', 'hr'], ['Spider', 'holly'], ['Wolf', 'air'], ['Iron', 'moviebox']];
  for (const [label, url] of [['FG S24E10', 'tv/1434/24/10'], ['Matrix', 'movie/603'], ['BB S1E1', 'tv/1396/1/1']]) {
    console.log('## peachify', label);
    await Promise.all(servers.map(async ([n, p]) => {
      const t0 = Date.now();
      try {
        const r = await fetch(`https://x.eat-peach.sbs/${p}/${url}`, { headers: H, signal: AbortSignal.timeout(20000) });
        const tx = await r.text();
        if (!r.ok) return console.log('  ', n, 'HTTP', r.status, cut(tx, 60));
        const j = JSON.parse(tx);
        const d = await (await fetch('https://enc-dec.app/api/dec-peachify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: j.data }) })).json();
        console.log('  ', n, Date.now() - t0 + 'ms', cut(JSON.stringify(d.result), 500));
      } catch (e) { console.log('  ', n, 'ERR', e.message); }
    }));
  }
}

async function hexa() {
  for (const [label, path] of [['FG S24E10', 'tv/1434/season/24/episode/10'], ['Matrix', 'movie/603'], ['BB S1E1', 'tv/1396/season/1/episode/1']]) {
    console.log('## hexa', label);
    try {
      const key = crypto.randomBytes(32).toString('hex');
      const tok = (await (await fetch('https://enc-dec.app/api/enc-hexa')).json()).result.token;
      const r = await fetch(`https://theemoviedb.hexa.su/api/tmdb/${path}/images`, {
        headers: { 'User-Agent': UA, Referer: 'https://hexa.su/', Accept: 'text/plain', 'X-Fingerprint-Lite': 'e9136c41504646444', 'X-Api-Key': key, 'X-Cap-Token': tok },
        signal: AbortSignal.timeout(20000),
      });
      const tx = await r.text();
      if (!r.ok) { console.log('   HTTP', r.status, cut(tx, 80)); continue; }
      const d = await (await fetch('https://enc-dec.app/api/dec-hexa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: tx, key }) })).json();
      console.log('  ', cut(JSON.stringify(d.result || d), 700));
    } catch (e) { console.log('   ERR', e.message); }
  }
}

(async () => { await peachify(); await hexa(); })();
