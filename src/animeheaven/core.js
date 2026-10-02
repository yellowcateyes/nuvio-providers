// AnimeHeaven provider for Nuvio (anime, direct MP4, Japanese audio + soft English subs)
//
// animeheaven.me has no API, so this scrapes it:
//   1. TMDB gives the show's names (incl. alternative titles) and the season's episode count
//   2. the site search lists candidate entries; each season/arc is its own entry
//   3. an entry is accepted only if its episode count matches TMDB's season (guards against wrong seasons)
//   4. the episode "key" is set as a cookie on gate.php, which returns the direct MP4 URLs
//   5. the real resolution is read from the MP4 header so labels are truthful

const BASE = 'https://animeheaven.me';
const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB = 'https://api.themoviedb.org/3';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12000;
const MAX_CANDIDATES_TO_OPEN = 4;

function timeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
        promise.then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
}

function get(url, headers, label) {
    return timeout(fetch(url, { headers: Object.assign({ 'User-Agent': UA }, headers || {}) }), TIMEOUT_MS, label || 'request')
        .then(function (res) {
            if (!res.ok) throw new Error((label || 'request') + ' HTTP ' + res.status);
            return res;
        });
}

function norm(s) {
    return String(s || '').toLowerCase()
        .replace(/&amp;/g, '&')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\b(the|a|an)\b/g, ' ')
        .replace(/\s+/g, ' ').trim();
}

function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function tokenScore(a, b) {
    var ta = norm(a).split(' ').filter(Boolean), tb = norm(b).split(' ').filter(Boolean);
    if (!ta.length || !tb.length) return 0;
    var set = {};
    tb.forEach(function (t) { set[t] = true; });
    var hit = ta.filter(function (t) { return set[t]; }).length;
    return hit / Math.max(ta.length, tb.length);
}

// ---------- TMDB ----------
function tmdbInfo(tmdbId, mediaType, season) {
    var kind = mediaType === 'tv' ? 'tv' : 'movie';
    return get(TMDB + '/' + kind + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&append_to_response=alternative_titles', null, 'tmdb')
        .then(function (r) { return r.json(); })
        .then(function (d) {
            var names = [d.name || d.title, d.original_name || d.original_title];
            var alts = (d.alternative_titles && (d.alternative_titles.results || d.alternative_titles.titles)) || [];
            alts.slice(0, 12).forEach(function (a) { names.push(a.title); });
            var seen = {};
            names = names.filter(function (n) { n = norm(n); if (!n || seen[n]) return false; seen[n] = true; return true; });
            var seasons = d.seasons || [];
            var cur = seasons.filter(function (s) { return s.season_number === season; })[0];
            var before = seasons.filter(function (s) { return s.season_number > 0 && s.season_number < season; })
                .reduce(function (n, s) { return n + (s.episode_count || 0); }, 0);
            return {
                title: d.name || d.title,
                names: names,
                arcName: (cur && cur.name && !/^season \d+$/i.test(cur.name) && cur.name) || '',
                seasonEpisodes: cur ? cur.episode_count : 0,
                episodesBefore: before,
                year: String(d.first_air_date || d.release_date || '').slice(0, 4)
            };
        });
}

// ---------- site ----------
function search(query) {
    return get(BASE + '/search.php?s=' + encodeURIComponent(query), { Referer: BASE + '/' }, 'search')
        .then(function (r) { return r.text(); })
        .then(function (html) {
            var out = [], re = /<a href='anime\.php\?([a-z0-9]+)' class='c'>([^<]+)<\/a>/g, m;
            while ((m = re.exec(html))) out.push({ id: m[1], name: m[2].replace(/&amp;/g, '&').replace(/&#0?39;/g, "'") });
            return out;
        })
        .catch(function () { return []; });
}

function openEntry(id) {
    return get(BASE + '/anime.php?' + id, { Referer: BASE + '/' }, 'anime page')
        .then(function (r) { return r.text(); })
        .then(function (html) {
            var eps = {}, count = 0, re = /id ?= ?"([a-f0-9]{32})"[\s\S]*?watch2[^>]*>\s*(\d+)\s*</g, m;
            while ((m = re.exec(html))) { eps[+m[2]] = m[1]; count++; }
            return { id: id, episodes: eps, count: count };
        });
}

// Words that may follow a show's base title in an entry name without changing which show it is.
var MARKER_WORDS = /^(season|final|part|cour|ii|iii|iv|v|\d+(st|nd|rd|th)?)$/;

// Splits "Attack on Titan 3rd Season: Part II" into { base: 'attack on titan', rank: [3, 2] }.
// Returns null when the name carries words beyond season/part markers (arcs, movies, OVAs, spin-offs).
function parseEntryName(name, baseNorms) {
    var n = norm(name);
    var base = baseNorms.filter(function (b) { return n === b || n.indexOf(b + ' ') === 0; })
        .sort(function (x, y) { return y.length - x.length; })[0];
    if (!base) return null;
    var rest = n.slice(base.length).trim().split(' ').filter(Boolean);
    if (rest.some(function (w) { return !MARKER_WORDS.test(w); })) return null;
    var text = rest.join(' ');
    var seasonNum = 1;
    var m = text.match(/(\d+)(?:st|nd|rd|th)? season/) || text.match(/season (\d+)/);
    if (m) seasonNum = parseInt(m[1], 10);
    else if (/\bfinal\b/.test(text)) seasonNum = 99;
    var part = 1;
    var pm = text.match(/part (ii|iii|iv|\d+)/);
    if (pm) part = ({ ii: 2, iii: 3, iv: 4 })[pm[1]] || parseInt(pm[1], 10);
    return { seasonNum: seasonNum, part: part };
}

function queriesFor(info, season) {
    var qs = [];
    info.names.slice(0, 4).forEach(function (n) {
        qs.push(n);
        if (season > 1) {
            qs.push(n + ' ' + ordinal(season) + ' Season');
            qs.push(n + ' Season ' + season);
        }
    });
    if (info.arcName) qs.push(info.arcName);
    var seen = {};
    return qs.filter(function (q) { var k = norm(q); if (!k || seen[k]) return false; seen[k] = true; return true; }).slice(0, 8);
}

function collect(info, season) {
    return Promise.all(queriesFor(info, season).map(search)).then(function (lists) {
        var byId = {}, out = [];
        lists.forEach(function (l) { l.forEach(function (it) { if (!byId[it.id]) { byId[it.id] = true; out.push(it); } }); });
        return out;
    });
}

function openAll(items) {
    return Promise.all(items.map(function (it) {
        return openEntry(it.id).then(function (e) { e.name = it.name; e.rank = it.rank; return e; }).catch(function () { return null; });
    })).then(function (list) { return list.filter(Boolean); });
}

// Returns { entry, number } for the requested episode, or null when it cannot be mapped with confidence.
function locate(info, mediaType, season, episode) {
    var baseNorms = info.names.map(norm).filter(Boolean);
    return collect(info, season).then(function (items) {
        if (mediaType === 'movie') {
            var movies = items.filter(function (it) { return baseNorms.indexOf(norm(it.name)) !== -1; }).slice(0, 2);
            return openAll(movies).then(function (es) {
                var one = es.filter(function (e) { return e.count === 1; })[0];
                return one ? { entry: one, number: 1 } : null;
            });
        }
        var want = info.seasonEpisodes;
        // (a) TMDB names the season after an arc and the site has an entry for that arc
        var arcNorm = info.arcName ? norm(info.arcName) : '';
        var arcMatches = arcNorm ? items.filter(function (it) {
            var n = norm(it.name);
            return n.indexOf(arcNorm) !== -1 && baseNorms.some(function (b) { return n.indexOf(b) === 0; });
        }).slice(0, 2) : [];
        var arcStep = arcMatches.length ? openAll(arcMatches).then(function (es) {
            var hit = es.filter(function (e) { return want && e.count === want; })[0];
            return hit ? { entry: hit, number: episode } : null;
        }) : Promise.resolve(null);
        return arcStep.then(function (hit) {
            if (hit) return hit;
            // (b) absolute numbering: chain the show's plain/"Nth season"/"part" entries in order
            var chain = [];
            items.forEach(function (it) {
                var parsed = parseEntryName(it.name, baseNorms);
                if (parsed) { it.rank = parsed; chain.push(it); }
            });
            chain.sort(function (a, b) { return a.rank.seasonNum - b.rank.seasonNum || a.rank.part - b.rank.part; });
            if (!chain.length || chain[0].rank.seasonNum !== 1 || chain[0].rank.part !== 1) return null; // need the plain entry as the anchor
            return openAll(chain.slice(0, 8)).then(function (entries) {
                entries.sort(function (a, b) { return a.rank.seasonNum - b.rank.seasonNum || a.rank.part - b.rank.part; });
                // the whole season must be reachable: count of the chain up to this season must line up
                var absolute = info.episodesBefore + episode;
                var seasonOnePlain = season === 1 && want && entries[0] && entries[0].count === want;
                if (seasonOnePlain) return { entry: entries[0], number: episode };
                // long-running shows keep absolute numbering inside one entry (One Piece: episode 1050 is entry #1050)
                if (entries[0] && entries[0].episodes[absolute]) return { entry: entries[0], number: absolute };
                var passed = 0;
                for (var i = 0; i < entries.length; i++) {
                    if (absolute <= passed + entries[i].count) return { entry: entries[i], number: absolute - passed };
                    passed += entries[i].count;
                }
                return null;
            });
        });
    });
}

// ---------- stream ----------
function sourcesFor(hash, entryId) {
    return get(BASE + '/gate.php', { Referer: BASE + '/anime.php?' + entryId, Cookie: 'key=' + hash }, 'gate')
        .then(function (r) { return r.text(); })
        .then(function (html) {
            var urls = [], seen = {}, re = /<source src='([^']+\.mp4[^']*)'/g, m;
            while ((m = re.exec(html))) {
                var u = m[1];
                if (/[?&]error/.test(u) || seen[u]) continue; // the "&error" variants are fallbacks for failures
                seen[u] = true; urls.push(u);
            }
            return urls;
        });
}

// Reads width/height from the MP4 'tkhd' boxes in the first bytes (moov is at the front on this host).
function mp4Resolution(url, headers) {
    return timeout(fetch(url, { headers: Object.assign({ Range: 'bytes=0-1048575' }, headers) }), 10000, 'mp4 header')
        .then(function (res) { return res.arrayBuffer(); })
        .then(function (buf) {
            var b = new Uint8Array(buf), best = 0, bestH = 0;
            for (var i = 4; i < b.length - 8; i++) {
                if (b[i] === 0x74 && b[i + 1] === 0x6b && b[i + 2] === 0x68 && b[i + 3] === 0x64) { // 'tkhd'
                    var size = ((b[i - 4] << 24) | (b[i - 3] << 16) | (b[i - 2] << 8) | b[i - 1]) >>> 0;
                    if (size < 84 || size > 120 || i - 4 + size > b.length) continue;
                    var end = i - 4 + size;
                    var w = (((b[end - 8] << 8) | b[end - 7])) >>> 0, h = (((b[end - 4] << 8) | b[end - 3])) >>> 0;
                    if (w * h > best) { best = w * h; bestH = h; }
                }
            }
            return bestH;
        })
        .catch(function () { return 0; });
}

function label(h) {
    if (!h) return 'Unknown';
    if (h >= 2000) return '2160p';
    if (h >= 1000) return '1080p';
    if (h >= 700) return '720p';
    if (h >= 460) return '480p';
    return '360p';
}

function getStreams(tmdbId, mediaType, season, episode) {
    var s = mediaType === 'tv' ? (season || 1) : 1;
    var e = mediaType === 'tv' ? (episode || 1) : 1;
    return tmdbInfo(tmdbId, mediaType, s)
        .then(function (info) {
            return locate(info, mediaType, s, e).then(function (hit) {
                if (!hit) return [];
                var hash = hit.entry.episodes[hit.number];
                if (!hash) return [];
                return sourcesFor(hash, hit.entry.id).then(function (urls) {
                    var headers = { 'User-Agent': UA, 'Referer': BASE + '/' };
                    return Promise.all(urls.map(function (u, i) {
                        return mp4Resolution(u, headers).then(function (h) {
                            return {
                                name: 'AnimeHeaven' + (urls.length > 1 ? ' #' + (i + 1) : '') + ' (Sub)',
                                title: hit.entry.name + (mediaType === 'tv' ? ' - Episode ' + hit.number : ''),
                                url: u,
                                quality: label(h),
                                headers: headers,
                                provider: 'animeheaven'
                            };
                        });
                    }));
                });
            });
        })
        .catch(function (err) {
            console.error('[AnimeHeaven] ' + err.message);
            return [];
        });
}

module.exports = { getStreams };
