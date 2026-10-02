// Vidfast provider for Nuvio
//
// Flow (all plain HTTPS, no browser needed):
//   1. vidfast.pro/<type>/<tmdb>  -> the page embeds an opaque "en" payload
//   2. enc-dec.app/api/enc-vidfast -> turns it into the server/stream endpoints + CSRF token
//   3. POST <servers>             -> encrypted server list, decrypted with enc-dec.app/api/dec-vidfast
//   4. POST <stream>/<server>     -> encrypted stream info (HLS master playlist + subtitle tracks)
//
// enc-dec.app does the site-specific encryption; if it is unreachable the provider returns [].

const SITE = 'https://vidfast.pro';
const ENC_DEC = 'https://enc-dec.app/api';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT_MS = 12000;

const PLAYBACK_HEADERS = {
    'User-Agent': USER_AGENT,
    'Referer': SITE + '/',
    'Origin': SITE
};

function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
        promise.then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
}

function request(url, options, label) {
    return withTimeout(fetch(url, options), REQUEST_TIMEOUT_MS, label).then(function (res) {
        if (!res.ok) throw new Error(label + ' HTTP ' + res.status);
        return res.text();
    });
}

function decrypt(text) {
    return request(ENC_DEC + '/dec-vidfast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
    }, 'dec-vidfast').then(function (body) {
        var json = JSON.parse(body);
        if (json.status !== 200 || json.result === undefined) throw new Error('dec-vidfast refused the payload');
        return json.result;
    });
}

function getTitle(tmdbId, mediaType) {
    // Only used for the stream label; failure is harmless.
    var kind = mediaType === 'tv' ? 'tv' : 'movie';
    return request('https://api.themoviedb.org/3/' + kind + '/' + tmdbId + '?api_key=439c478a771f35c05022f9feabcca01c', {
        headers: { 'User-Agent': USER_AGENT }
    }, 'tmdb').then(function (body) {
        var d = JSON.parse(body);
        var year = String(d.release_date || d.first_air_date || '').slice(0, 4);
        return (d.title || d.name || '') + (year ? ' (' + year + ')' : '');
    }).catch(function () { return ''; });
}

function englishSubtitles(tracks) {
    var subs = [];
    (tracks || []).forEach(function (t) {
        var label = String(t.label || '');
        var kind = String(t.kind || '');
        if (!t.file || (kind && kind !== 'captions' && kind !== 'subtitles')) return;
        if (!/english/i.test(label)) return;
        subs.push({ url: t.file, language: 'en', name: label, headers: PLAYBACK_HEADERS });
    });
    return subs;
}

function getStreams(tmdbId, mediaType, season, episode) {
    var path = mediaType === 'tv'
        ? '/tv/' + tmdbId + '/' + (season || 1) + '/' + (episode || 1)
        : '/movie/' + tmdbId;

    var titlePromise = getTitle(tmdbId, mediaType);

    return request(SITE + path, { headers: { 'User-Agent': USER_AGENT } }, 'page')
        .then(function (html) {
            var m = html.match(/\\"en\\":\\"([^\\]+)\\"/);
            if (!m) throw new Error('payload not found on page (site layout changed?)');
            return request(ENC_DEC + '/enc-vidfast?text=' + encodeURIComponent(m[1]), { headers: { 'User-Agent': USER_AGENT } }, 'enc-vidfast');
        })
        .then(function (body) {
            var enc = JSON.parse(body).result;
            if (!enc || !enc.servers || !enc.stream) throw new Error('enc-vidfast returned no endpoints');
            var headers = {
                'User-Agent': USER_AGENT,
                'Referer': SITE + '/',
                'Origin': SITE,
                'X-Csrf-Token': enc.token || '',
                'Accept': '*/*'
            };
            return request(enc.servers, { method: 'POST', headers: headers }, 'servers')
                .then(decrypt)
                .then(function (servers) {
                    return titlePromise.then(function (title) {
                        var label = title + (mediaType === 'tv' ? ' S' + String(season).padStart(2, '0') + 'E' + String(episode).padStart(2, '0') : '');
                        return Promise.all((servers || []).map(function (server) {
                            return request(enc.stream + '/' + server.data, { method: 'POST', headers: headers }, 'stream ' + server.name)
                                .then(decrypt)
                                .then(function (info) {
                                    if (!info || !info.url) return null;
                                    return {
                                        name: 'Vidfast ' + server.name,
                                        title: label,
                                        url: info.url,
                                        quality: 'Auto',
                                        type: /\.m3u8/i.test(info.url) ? 'hls' : undefined,
                                        headers: PLAYBACK_HEADERS,
                                        subtitles: englishSubtitles(info.tracks),
                                        provider: 'vidfast'
                                    };
                                })
                                .catch(function () { return null; }); // one dead server must not sink the rest
                        }));
                    });
                });
        })
        .then(function (streams) { return streams.filter(Boolean); })
        .catch(function (err) {
            console.error('[Vidfast] ' + err.message);
            return [];
        });
}

module.exports = { getStreams };
