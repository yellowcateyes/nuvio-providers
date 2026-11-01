// VidNest provider for Nuvio (movies + TV, several independent HLS/MP4 backends)
//
// new.vidnest.fun is the API behind vidnest.fun's player. For every server it takes a plain
// TMDB-based path (/<server>/movie/<tmdb> or /<server>/tv/<tmdb>/<season>/<episode>) and answers
// JSON; when the answer is flagged "encrypted" the "data" field is base64 with a custom (shuffled)
// alphabet that decodes to the real JSON. No third-party decryption service is needed.
// Every server is a different upstream, so a dead server just drops out.

const API = 'https://new.vidnest.fun';
const TMDB = 'https://api.themoviedb.org/3';
const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12000;
const CryptoJS = require('crypto-js');
// The API now wants a random per-request nonce (?_n=) and answers { v: 2, d, n }: AES-256-GCM,
// key = SHA-256("<n>|<SECRET>"), d = base64url(iv(12) | ciphertext | tag(16)). GCM is CTR mode starting at
// counter 2, so crypto-js (provided by the app) can decrypt it; the auth tag is dropped, not verified.
// The site rotates this secret every few days, so the current one is also looked up in the live site bundle
// when decryption fails (see refreshSecret). Known values are tried first.
var SECRETS = ['K3p8vQ2mX9rL5wZ0fN7bG1sH4tJ6dC9_y8S3wM1nQ5pL2', 'F9k2mR8vL4qP7wY1zN0fG3bS6tH5jC8d_x4R7vN2mP9qL1'];
var secretRefresh = null;
const ALPHABET = 'RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=';
const SITE_HEADERS = { 'Accept': '*/*', 'Origin': 'https://vidnest.fun', 'Referer': 'https://vidnest.fun/', 'User-Agent': UA };

// label shown to the user -> API path. vidnest.fun also lists yflix / rogflix / videasy (HLS whose segments
// are disguised as PNG images, which normal players cannot play) and superstream (segments answer 403 /
// wrong language), so only the two servers that return real video are used.
const SERVERS = [
    { label: 'Zeta', path: 'nextgencloudfabric' },
    { label: 'Gama', path: 'vidzee' }
];

function timeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
        promise.then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
}

function fetchJson(url, options, label) {
    return timeout(fetch(url, options), TIMEOUT_MS, label).then(function (res) {
        if (!res.ok) throw new Error(label + ' HTTP ' + res.status);
        return res.json();
    });
}

function randomNonce() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', out = '';
    for (var i = 0; i < 22; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
}

function decryptV2(d, n, secret) {
    var b64 = String(d).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var hex = CryptoJS.enc.Hex.stringify(CryptoJS.enc.Base64.parse(b64));
    if (hex.length < 56) throw new Error('payload too short');
    var key = CryptoJS.SHA256(String(n) + '|' + secret);
    var plain = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Hex.parse(hex.slice(24, hex.length - 32)) },
        key,
        { iv: CryptoJS.enc.Hex.parse(hex.slice(0, 24) + '00000002'), mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding }
    ).toString(CryptoJS.enc.Utf8);
    return JSON.parse(plain);
}

// Tries every known secret; throws when none decrypts to JSON.
function tryDecrypt(d, n) {
    var last;
    for (var i = 0; i < SECRETS.length; i++) {
        try { return decryptV2(d, n, SECRETS[i]); } catch (e) { last = e; }
    }
    throw last || new Error('no secret decrypts the payload');
}

// Reads the current secret out of vidnest.fun's own JavaScript (shared by concurrent servers).
function refreshSecret() {
    if (secretRefresh) return secretRefresh;
    secretRefresh = timeout(fetch('https://vidnest.fun/movie/603', { headers: { 'User-Agent': UA } }), TIMEOUT_MS, 'vidnest page')
        .then(function (r) { return r.text(); })
        .then(function (html) {
            var chunks = [], seen = {}, re = /\/_next\/static\/chunks\/[A-Za-z0-9_.-]+\.js/g, m;
            while ((m = re.exec(html))) if (!seen[m[0]]) { seen[m[0]] = true; chunks.push(m[0]); }
            return Promise.all(chunks.map(function (c) {
                return timeout(fetch('https://vidnest.fun' + c, { headers: { 'User-Agent': UA } }), TIMEOUT_MS, 'chunk')
                    .then(function (r) { return r.text(); })
                    .then(function (js) {
                        var f = js.match(/let [A-Za-z_$]="([A-Za-z0-9_-]{24,64})",[A-Za-z_$]="https:\/\/new\.vidnest\.fun"/);
                        return f ? f[1] : null;
                    })
                    .catch(function () { return null; });
            }));
        })
        .then(function (found) {
            var secret = found.filter(Boolean)[0];
            if (secret && SECRETS.indexOf(secret) === -1) SECRETS.unshift(secret);
            return secret || null;
        })
        .catch(function () { return null; });
    return secretRefresh;
}

// base64 with a custom alphabet, UTF-8 payload (no Buffer / TextDecoder dependence)
function decodeCipher(text) {
    var map = {};
    for (var i = 0; i < ALPHABET.length; i++) map[ALPHABET.charAt(i)] = i;
    var bytes = [];
    for (var p = 0; p < text.length; p += 4) {
        var chunk = text.substr(p, 4);
        while (chunk.length < 4) chunk += '=';
        var v = [];
        for (var j = 0; j < 4; j++) {
            var t = map[chunk.charAt(j)];
            v.push(t === undefined ? 64 : t);
        }
        bytes.push((v[0] << 2) | (v[1] >> 4));
        if (v[2] !== 64) bytes.push(((v[1] & 15) << 4) | (v[2] >> 2));
        if (v[3] !== 64) bytes.push(((v[2] & 3) << 6) | v[3]);
    }
    var out = '';
    for (var k = 0; k < bytes.length; k++) out += '%' + ('0' + (bytes[k] & 255).toString(16)).slice(-2);
    try { return decodeURIComponent(out); } catch (e) {
        var raw = '';
        for (var m = 0; m < bytes.length; m++) raw += String.fromCharCode(bytes[m] & 255);
        return raw;
    }
}

function isEnglish(lang) {
    if (!lang) return true;
    return /^(en|english|multi|original|auto)/i.test(String(lang).trim());
}

function tmdbLabel(tmdbId, mediaType) {
    return fetchJson(TMDB + '/' + (mediaType === 'tv' ? 'tv' : 'movie') + '/' + tmdbId + '?api_key=' + TMDB_KEY, { headers: { 'User-Agent': UA } }, 'TMDB')
        .then(function (d) {
            var date = d.release_date || d.first_air_date || '';
            return (d.title || d.name || '') + (date ? ' (' + date.slice(0, 4) + ')' : '');
        })
        .catch(function () { return ''; });
}

function shapeServerJson(server, j) {
    if (!j) return [];
    var items = [];
    if (Array.isArray(j.streams)) {
        j.streams.forEach(function (s) { if (s && s.url && isEnglish(s.language)) items.push({ url: s.url, headers: s.headers, type: s.type, language: s.language }); });
    } else if (j.url) {
        items.push({ url: j.url, headers: j.headers });
        (Array.isArray(j.all_urls) ? j.all_urls : []).slice(0, 2).forEach(function (u) { if (u && u !== j.url) items.push({ url: u, headers: j.headers }); });
    }
    return items.map(function (it) {
        var isMp4 = it.type === 'mp4' || /\.(mp4|mkv)(\?|$)/i.test(it.url);
        var headers = {};
        var src = it.headers && typeof it.headers === 'object' ? it.headers : {};
        for (var k in src) headers[String(k).trim()] = String(src[k]).trim();
        if (!headers['User-Agent']) headers['User-Agent'] = UA;
        return { server: server.label, url: String(it.url).replace(/\s+/g, ''), headers: headers, isMp4: isMp4 };
    });
}

function fetchServer(server, tmdbId, mediaType, season, episode) {
    var url = API + '/' + server.path + '/' + (mediaType === 'tv' ? 'tv/' + tmdbId + '/' + season + '/' + episode : 'movie/' + tmdbId);
    return fetchJson(url + '?_n=' + randomNonce(), { headers: SITE_HEADERS }, server.label).then(function (j) {
        if (j && j.v === 2 && j.d) {
            var payload = j;
            try { return shapeServerJson(server, tryDecrypt(payload.d, payload.n)); }
            catch (e) {
                // the secret was probably rotated: read the new one from the live site and retry once
                return refreshSecret().then(function () { return shapeServerJson(server, tryDecrypt(payload.d, payload.n)); });
            }
        }
        if (j && j.encrypted && typeof j.data === 'string') j = JSON.parse(decodeCipher(j.data));
        return shapeServerJson(server, j);
    }).catch(function () { return []; }); // one dead server must not sink the rest
}

function getStreams(tmdbId, mediaType, season, episode) {
    mediaType = mediaType === 'tv' ? 'tv' : 'movie';
    return Promise.all([
        tmdbLabel(tmdbId, mediaType),
        Promise.all(SERVERS.map(function (s) { return fetchServer(s, tmdbId, mediaType, season, episode); }))
    ]).then(function (res) {
        var title = res[0] + (mediaType === 'tv' ? ' S' + String(season).padStart(2, '0') + 'E' + String(episode).padStart(2, '0') : '');
        var out = [];
        res[1].forEach(function (list) {
            list.forEach(function (s) {
                out.push({
                    name: 'VidNest ' + s.server,
                    title: title,
                    url: s.url,
                    quality: 'Auto',
                    type: s.isMp4 ? undefined : 'hls',
                    headers: s.headers,
                    subtitles: [],
                    provider: 'vidnest'
                });
            });
        });
        return out;
    }).catch(function (err) {
        console.error('[VidNest] ' + err.message);
        return [];
    });
}

module.exports = { getStreams };
