// AniZone provider for Nuvio (anime, 1080p HLS, Japanese + English audio tracks, ASS subtitles)
//
//   1. TMDB gives the show's names (incl. alternative titles), season air dates and episode counts
//   2. anizone.to/anime?search=... embeds the matching entries (slug, titles, start year, episode count)
//   3. the entry is chosen by name + start year + episode count; if TMDB flattened several cours into one
//      season, entries are chained in release order (absolute numbering). Anything uncertain returns nothing.
//   4. /anime/<slug>/<n> embeds the player config with the HLS master playlist and subtitle files

const BASE = 'https://anizone.to';
const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB = 'https://api.themoviedb.org/3';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12000;

const HEADERS = { 'User-Agent': UA, 'Referer': BASE + '/', 'Origin': BASE };

function timeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
        promise.then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
}

function get(url, label) {
    return timeout(fetch(url, { headers: { 'User-Agent': UA, 'Referer': BASE + '/' } }), TIMEOUT_MS, label)
        .then(function (res) {
            if (!res.ok) throw new Error(label + ' HTTP ' + res.status);
            return res.text();
        });
}

function norm(s) {
    return String(s || '').toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9\s]/g, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

// Livewire pages embed their data as  JSON.parse('...') with "-escaped quotes inside an HTML attribute.
function embeddedJson(html, marker) {
    var re = new RegExp(marker + "JSON\\.parse\\('((?:[^'\\\\]|\\\\.)*)'\\)");
    var m = html.match(re);
    if (!m) return null;
    try {
        return JSON.parse(JSON.parse('"' + m[1].replace(/\\u0022/g, '\\"') + '"'));
    } catch (e) {
        return null;
    }
}

function tmdbInfo(tmdbId, mediaType) {
    var kind = mediaType === 'tv' ? 'tv' : 'movie';
    return get(TMDB + '/' + kind + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&append_to_response=alternative_titles', 'tmdb')
        .then(function (body) {
            var d = JSON.parse(body);
            var names = [d.name || d.title, d.original_name || d.original_title];
            var alts = (d.alternative_titles && (d.alternative_titles.results || d.alternative_titles.titles)) || [];
            alts.slice(0, 15).forEach(function (a) { names.push(a.title); });
            var seen = {};
            names = names.filter(function (n) { n = norm(n); if (!n || seen[n]) return false; seen[n] = true; return true; });
            var seasons = (d.seasons || []).filter(function (s) { return s.season_number > 0; });
            return {
                title: d.name || d.title,
                names: names,
                year: parseInt(String(d.first_air_date || d.release_date || '').slice(0, 4), 10) || 0,
                seasons: seasons.map(function (s) {
                    return { number: s.season_number, name: s.name, episodes: s.episode_count || 0, year: parseInt(String(s.air_date || '').slice(0, 4), 10) || 0 };
                })
            };
        });
}

function searchEntries(query) {
    return get(BASE + '/anime?search=' + encodeURIComponent(query), 'search')
        .then(function (html) {
            var items = embeddedJson(html, "items: ");
            return Array.isArray(items) ? items : [];
        })
        .catch(function () { return []; });
}

function titlesOf(item) {
    var out = [item.main_title];
    var list = item.title_list || {};
    Object.keys(list).forEach(function (k) { out.push(list[k]); });
    return out.map(norm).filter(Boolean);
}

function matchesShow(item, baseNorms) {
    var titles = titlesOf(item);
    return titles.some(function (t) {
        return baseNorms.some(function (b) { return t === b || t.indexOf(b + ' ') === 0; });
    });
}

function isRegularSeries(item) {
    var t = String(item.type || '');
    return !t || (/(tv|series|web)/i.test(t) && !/(movie|ova|special|music)/i.test(t));
}

// Chooses the entry + episode number for a TMDB (season, episode), or null when not certain.
function locate(info, mediaType, season, episode, items) {
    var baseNorms = info.names.map(norm);
    if (mediaType === 'movie') {
        var movies = items.filter(function (it) {
            return /movie/i.test(String(it.type || '')) && titlesOf(it).some(function (t) { return baseNorms.indexOf(t) !== -1; }) &&
                (!info.year || !it.start_year || Math.abs(it.start_year - info.year) <= 1);
        });
        return movies.length ? { item: movies[0], number: 1 } : null;
    }
    var show = items.filter(function (it) { return isRegularSeries(it) && matchesShow(it, baseNorms) && it.episode_count; });
    var cur = info.seasons.filter(function (s) { return s.number === season; })[0];
    if (!cur) return null;

    // 1. an entry with the same episode count that started in the season's year
    var exact = show.filter(function (it) {
        return it.episode_count === cur.episodes && (!cur.year || !it.start_year || Math.abs(it.start_year - cur.year) <= 1);
    }).sort(function (a, b) { return Math.abs((a.start_year || 0) - cur.year) - Math.abs((b.start_year || 0) - cur.year); });
    if (exact.length === 1 || (exact.length > 1 && exact[0].start_year !== exact[1].start_year)) {
        return { item: exact[0], number: episode };
    }
    if (exact.length > 1) {
        // same count, same year: only the arc name in the title can tell them apart
        var arc = norm(cur.name);
        var named = arc && !/^season \d+$/.test(arc) ? exact.filter(function (it) { return titlesOf(it).some(function (t) { return t.indexOf(arc.replace(/ arc$/, '')) !== -1; }); }) : [];
        return named.length === 1 ? { item: named[0], number: episode } : null;
    }

    // 2. TMDB merged several cours into one season: chain the show's entries in release order
    var chain = show.slice().sort(function (a, b) { return (a.start_year || 0) - (b.start_year || 0) || a.main_title.localeCompare(b.main_title); });
    var total = info.seasons.reduce(function (n, s) { return n + s.episodes; }, 0);
    var chainTotal = chain.reduce(function (n, it) { return n + it.episode_count; }, 0);
    if (!chain.length || Math.abs(chainTotal - total) > 2) return null; // the chain must cover the whole TMDB show
    var absolute = info.seasons.filter(function (s) { return s.number < season; }).reduce(function (n, s) { return n + s.episodes; }, 0) + episode;
    var passed = 0;
    for (var i = 0; i < chain.length; i++) {
        if (absolute <= passed + chain[i].episode_count) return { item: chain[i], number: absolute - passed };
        passed += chain[i].episode_count;
    }
    return null;
}

function episodeStream(item, number) {
    return get(BASE + '/anime/' + item.slug + '/' + number, 'episode page').then(function (html) {
        var player = embeddedJson(html, "vidstackPlayer\\(");
        if (!player || !player.src) return null;
        var subtitles = (player.subtitles || []).filter(function (s) { return s.file; }).map(function (s) {
            return { url: s.file, language: s.language || 'en', name: s.title || 'English', headers: HEADERS };
        });
        return { src: player.src, subtitles: subtitles };
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
    var s = mediaType === 'tv' ? (season || 1) : 1;
    var e = mediaType === 'tv' ? (episode || 1) : 1;
    return tmdbInfo(tmdbId, mediaType)
        .then(function (info) {
            var queries = info.names.slice(0, 3);
            return Promise.all(queries.map(searchEntries)).then(function (lists) {
                var seen = {}, items = [];
                lists.forEach(function (l) { l.forEach(function (it) { if (!seen[it.slug]) { seen[it.slug] = true; items.push(it); } }); });
                var hit = locate(info, mediaType, s, e, items);
                if (!hit) return [];
                return episodeStream(hit.item, hit.number).then(function (ep) {
                    if (!ep) return [];
                    return [{
                        name: 'AniZone',
                        title: hit.item.main_title + (mediaType === 'tv' ? ' - Episode ' + hit.number : ''),
                        url: ep.src,
                        quality: 'Auto',
                        type: 'hls',
                        headers: HEADERS,
                        subtitles: ep.subtitles,
                        provider: 'anizone'
                    }];
                });
            });
        })
        .catch(function (err) {
            console.error('[AniZone] ' + err.message);
            return [];
        });
}

module.exports = { getStreams };
