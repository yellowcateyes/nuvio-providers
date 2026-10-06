// Cinejoy provider for Nuvio (movies + TV, several independent HLS servers)
//
//   1. TMDB: title, year, IMDb id
//   2. api.wing.st/servers lists the servers; for each server enc-dec.app/api/enc-cinejoy turns the
//      lookup URL into an encrypted request body
//   3. POST api.wing.st/g with that body -> encrypted answer, decrypted by enc-dec.app/api/dec-cinejoy
//      into { data: { stream: [{ type: 'hls', playlist, captions: [...] }] } }
//
// enc-dec.app does the site-specific encryption; if it is unreachable the provider returns [].

const API = 'https://api.wing.st';
const ENC_DEC = 'https://enc-dec.app/api';
const TMDB = 'https://api.themoviedb.org/3';
const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
const TIMEOUT_MS = 15000;
const FALLBACK_SERVERS = ['Nebula', 'Lisbon', 'Solara'];

const SITE_HEADERS = { 'Accept': '*/*', 'Origin': 'https://cinejoy.pk', 'Referer': 'https://cinejoy.pk/', 'User-Agent': UA };

function timeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
        promise.then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
}

function json(url, options, label) {
    return timeout(fetch(url, options), TIMEOUT_MS, label).then(function (res) {
        if (!res.ok) throw new Error(label + ' HTTP ' + res.status);
        return res.json();
    });
}

// base64url helpers without Buffer (not available in React Native)
var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function toBase64Url(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 3) {
        var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
        out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
        if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
        if (i + 2 < bytes.length) out += B64[n & 63];
    }
    return out;
}
function fromBase64Url(str) {
    var clean = String(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    var bytes = [];
    for (var i = 0; i < clean.length; i += 4) {
        var a = B64.indexOf(clean[i]), b = B64.indexOf(clean[i + 1]);
        var c = i + 2 < clean.length ? B64.indexOf(clean[i + 2]) : -1;
        var d = i + 3 < clean.length ? B64.indexOf(clean[i + 3]) : -1;
        bytes.push(((a << 2) | (b >> 4)) & 255);
        if (c >= 0) bytes.push(((b << 4) | (c >> 2)) & 255);
        if (d >= 0) bytes.push(((c << 6) | d) & 255);
    }
    return new Uint8Array(bytes);
}

function tmdbInfo(tmdbId, mediaType) {
    var kind = mediaType === 'tv' ? 'tv' : 'movie';
    return json(TMDB + '/' + kind + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&append_to_response=external_ids', { headers: { 'User-Agent': UA } }, 'tmdb')
        .then(function (d) {
            return {
                title: d.name || d.title,
                year: String(d.first_air_date || d.release_date || '').slice(0, 4),
                imdb: d.imdb_id || (d.external_ids && d.external_ids.imdb_id) || ''
            };
        });
}

function listServers() {
    return json(API + '/servers', { headers: SITE_HEADERS }, 'servers')
        .then(function (j) { return (j.servers || []).map(function (s) { return s.name; }).filter(Boolean); })
        .catch(function () { return FALLBACK_SERVERS; });
}

function query(info, tmdbId, mediaType, season, episode, server) {
    var parts = [
        'title=' + encodeURIComponent(info.title),
        'type=' + (mediaType === 'tv' ? 'series' : 'movie'),
        'year=' + info.year,
        'imdb=' + info.imdb,
        'tmdb=' + tmdbId,
        'server=' + encodeURIComponent(server)
    ];
    if (mediaType === 'tv') parts.push('season=' + season, 'episode=' + episode);
    return API + '/?' + parts.join('&');
}

function fetchServer(info, tmdbId, mediaType, season, episode, server) {
    var lookup = query(info, tmdbId, mediaType, season, episode, server);
    return json(ENC_DEC + '/enc-cinejoy?url=' + encodeURIComponent(lookup), { headers: { 'User-Agent': UA } }, 'enc-cinejoy')
        .then(function (enc) {
            if (!enc || !enc.result || !enc.result.data) throw new Error('enc-cinejoy returned no data');
            return timeout(fetch(API + '/g', { method: 'POST', headers: SITE_HEADERS, body: fromBase64Url(enc.result.data) }), TIMEOUT_MS, 'g')
                .then(function (res) {
                    if (!res.ok) throw new Error('g HTTP ' + res.status);
                    return res.arrayBuffer();
                })
                .then(function (buf) {
                    return json(ENC_DEC + '/dec-cinejoy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: toBase64Url(new Uint8Array(buf)), state: enc.result.state })
                    }, 'dec-cinejoy');
                });
        })
        .then(function (dec) {
            var streams = (dec && dec.result && dec.result.data && dec.result.data.stream) || [];
            return streams.filter(function (s) { return s && s.playlist; }).map(function (s) {
                var subs = (s.captions || []).filter(function (c) { return c && c.url && /^en/i.test(String(c.id || c.language || 'en')); })
                    .map(function (c) { return { url: c.url, language: 'en', name: 'English', headers: SITE_HEADERS }; });
                return { server: server, url: s.playlist, subtitles: subs };
            });
        })
        .catch(function () { return []; }); // one dead server must not sink the rest
}

function getStreams(tmdbId, mediaType, season, episode) {
    return tmdbInfo(tmdbId, mediaType).then(function (info) {
        if (!info.title) return [];
        var label = info.title + (info.year ? ' (' + info.year + ')' : '') +
            (mediaType === 'tv' ? ' S' + String(season).padStart(2, '0') + 'E' + String(episode).padStart(2, '0') : '');
        return listServers().then(function (servers) {
            return Promise.all(servers.map(function (name) { return fetchServer(info, tmdbId, mediaType, season, episode, name); }));
        }).then(function (lists) {
            var out = [];
            lists.forEach(function (list) {
                list.forEach(function (s) {
                    out.push({
                        name: 'Cinejoy ' + s.server,
                        title: label,
                        url: s.url,
                        quality: 'Auto',
                        type: 'hls',
                        headers: SITE_HEADERS,
                        subtitles: s.subtitles,
                        provider: 'cinejoy'
                    });
                });
            });
            return out;
        });
    }).catch(function (err) {
        console.error('[Cinejoy] ' + err.message);
        return [];
    });
}

module.exports = { getStreams };
