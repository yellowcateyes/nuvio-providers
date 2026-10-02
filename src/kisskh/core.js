// KissKH provider for Nuvio (Korean/Asian dramas, HLS with English subtitles)
//
// KissKH protects its API with a per-request "kkey". enc-dec.app computes it:
//   GET enc-dec.app/api/enc-kisskh?text=<episodeId>&type=vid|sub
//
//   1. TMDB: titles (incl. alternative titles), first air year, season episode counts
//   2. /api/DramaList/Search?q=...            -> candidate dramas
//   3. /api/DramaList/Drama/<id>              -> episode list (+ release year)  => title + year must agree
//   4. /api/DramaList/Episode/<epId>.png?kkey -> { Video: <m3u8> }
//   5. /api/Sub/<epId>?kkey                   -> subtitle list (plain .srt/.vtt/.ass only)
//
// The mapping is deliberately conservative: it returns nothing instead of a different drama.
// NOTE: kisskh.* is behind a Cloudflare challenge for datacenter IPs. The provider tries each known
// domain and returns [] if all of them refuse, so it only produces streams where the site is reachable.

const DOMAINS = ['https://kisskh.do', 'https://kisskh.co', 'https://kisskh.id'];
const ENC_DEC = 'https://enc-dec.app/api';
const TMDB = 'https://api.themoviedb.org/3';
const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12000;

function timeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
        promise.then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
}

function norm(s) {
    return String(s || '').toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9\s]/g, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

function getJson(url, headers, label) {
    return timeout(fetch(url, { headers: headers }), TIMEOUT_MS, label).then(function (res) {
        if (!res.ok) throw new Error(label + ' HTTP ' + res.status);
        return res.text();
    }).then(function (text) {
        try { return JSON.parse(text); } catch (e) { throw new Error(label + ' did not return JSON'); }
    });
}

function siteHeaders(base) {
    return { 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*', 'Referer': base + '/', 'Origin': base };
}

// Runs fn(base) for each domain until one succeeds; remembers which domain worked.
function withDomain(fn) {
    var lastError = new Error('no KissKH domain reachable');
    return DOMAINS.reduce(function (chain, base) {
        return chain.catch(function () {
            return fn(base).then(function (result) { return { base: base, result: result }; });
        }, null);
    }, Promise.reject(lastError));
}

function tmdbInfo(tmdbId, mediaType) {
    var kind = mediaType === 'tv' ? 'tv' : 'movie';
    return getJson(TMDB + '/' + kind + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&append_to_response=alternative_titles', { 'User-Agent': UA }, 'tmdb')
        .then(function (d) {
            var names = [d.name || d.title, d.original_name || d.original_title];
            var alts = (d.alternative_titles && (d.alternative_titles.results || d.alternative_titles.titles)) || [];
            alts.slice(0, 15).forEach(function (a) { names.push(a.title); });
            var seen = {};
            names = names.filter(function (n) { n = norm(n); if (!n || seen[n]) return false; seen[n] = true; return true; });
            return {
                title: d.name || d.title,
                names: names,
                year: parseInt(String(d.first_air_date || d.release_date || '').slice(0, 4), 10) || 0,
                seasons: (d.seasons || []).filter(function (s) { return s.season_number > 0; })
            };
        });
}

function search(base, query) {
    return getJson(base + '/api/DramaList/Search?q=' + encodeURIComponent(query) + '&type=0', siteHeaders(base), 'search')
        .then(function (list) { return Array.isArray(list) ? list : []; });
}

function releaseYear(drama) {
    var m = String(drama.releaseDate || drama.ReleaseDate || '').match(/(19|20)\d{2}/);
    if (m) return parseInt(m[0], 10);
    var t = String(drama.title || '').match(/\((\d{4})\)/);
    return t ? parseInt(t[1], 10) : 0;
}

// Does this site title belong to the requested season of the show?
function titleFitsSeason(siteTitle, baseNorms, season) {
    var n = norm(siteTitle).replace(/\b(19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
    var base = baseNorms.filter(function (b) { return n === b || n.indexOf(b + ' ') === 0; }).sort(function (x, y) { return y.length - x.length; })[0];
    if (!base) return false;
    var rest = n.slice(base.length).trim();
    if (season === 1) return rest === '' || rest === 'season 1' || rest === '1';
    return rest === 'season ' + season || rest === String(season) || rest === season + 'nd season' || rest === season + 'rd season' || rest === season + 'th season';
}

function pickDrama(base, info, mediaType, season, episode) {
    var baseNorms = info.names.map(norm);
    var queries = info.names.slice(0, 3);
    return Promise.all(queries.map(function (q) { return search(base, q).catch(function () { return []; }); })).then(function (lists) {
        var seen = {}, cands = [];
        lists.forEach(function (l) { l.forEach(function (it) { if (it && it.id && !seen[it.id]) { seen[it.id] = true; cands.push(it); } }); });
        var fits = cands.filter(function (it) {
            return mediaType === 'movie' ? baseNorms.indexOf(norm(it.title)) !== -1 : titleFitsSeason(it.title, baseNorms, season);
        }).slice(0, 4);
        return Promise.all(fits.map(function (it) {
            return getJson(base + '/api/DramaList/Drama/' + it.id + '?isq=false', siteHeaders(base), 'drama').catch(function () { return null; });
        }));
    }).then(function (dramas) {
        var good = dramas.filter(function (d) {
            if (!d || !Array.isArray(d.episodes)) return false;
            var y = releaseYear(d);
            var cur = info.seasons.filter(function (x) { return x.season_number === season; })[0];
            var expected = (mediaType === 'tv' && cur && parseInt(String(cur.air_date || '').slice(0, 4), 10)) || info.year;
            return !expected || !y || Math.abs(y - expected) <= 1; // the year must agree when the site states one
        });
        for (var i = 0; i < good.length; i++) {
            var eps = good[i].episodes;
            var want = mediaType === 'movie' ? 1 : episode;
            var ep = eps.filter(function (e) { return Number(e.number) === want; })[0];
            if (!ep && mediaType === 'movie' && eps.length === 1) ep = eps[0];
            if (ep && ep.id) return { drama: good[i], episodeId: ep.id };
        }
        return null;
    });
}

function kkey(episodeId, type) {
    return getJson(ENC_DEC + '/enc-kisskh?text=' + encodeURIComponent(episodeId) + '&type=' + type, { 'User-Agent': UA }, 'enc-kisskh')
        .then(function (j) {
            if (!j || !j.result) throw new Error('enc-kisskh returned no key');
            return j.result;
        });
}

function plainSubtitle(src) {
    // KissKH encrypts some subtitle files (.txt/.txt1); only plain formats are usable without decrypting.
    return /\.(srt|vtt|ass|ssa)(\?|$)/i.test(src);
}

function getStreams(tmdbId, mediaType, season, episode) {
    var s = mediaType === 'tv' ? (season || 1) : 1;
    var e = mediaType === 'tv' ? (episode || 1) : 1;
    return tmdbInfo(tmdbId, mediaType).then(function (info) {
        return withDomain(function (base) {
            return pickDrama(base, info, mediaType, s, e).then(function (hit) {
                if (!hit) throw new Error('drama not found on ' + base);
                return Promise.all([kkey(hit.episodeId, 'vid'), kkey(hit.episodeId, 'sub')]).then(function (keys) {
                    var headers = siteHeaders(base);
                    return Promise.all([
                        getJson(base + '/api/DramaList/Episode/' + hit.episodeId + '.png?err=false&ts=&time=&kkey=' + keys[0], headers, 'episode'),
                        getJson(base + '/api/Sub/' + hit.episodeId + '?kkey=' + keys[1], headers, 'subtitles').catch(function () { return []; })
                    ]).then(function (res) {
                        return { base: base, drama: hit.drama, source: res[0], subs: res[1] };
                    });
                });
            });
        }).then(function (out) {
            var r = out.result;
            var url = r.source && (r.source.Video || r.source.video);
            if (!url) return [];
            var headers = { 'User-Agent': UA, 'Referer': r.base + '/', 'Origin': r.base };
            var subtitles = (Array.isArray(r.subs) ? r.subs : []).filter(function (x) { return x && x.src && plainSubtitle(x.src); }).map(function (x) {
                return { url: x.src, language: x.land || x.language || 'en', name: x.label || x.language || 'Subtitles', headers: headers };
            });
            return [{
                name: 'KissKH',
                title: (r.drama.title || info.title) + (mediaType === 'tv' ? ' - Episode ' + e : ''),
                url: url,
                quality: 'Auto',
                type: /\.m3u8/i.test(url) ? 'hls' : undefined,
                headers: headers,
                subtitles: subtitles,
                provider: 'kisskh'
            }];
        });
    }).catch(function (err) {
        console.error('[KissKH] ' + err.message);
        return [];
    });
}

module.exports = { getStreams };
