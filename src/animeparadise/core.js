// AnimeParadise provider for Nuvio (anime, 1080p HLS, Japanese audio + soft English subtitles)
//
//   1. TMDB gives the show's names and every episode's air date
//   2. api.animeparadise.moe/search lists entries (start date, episode count); each entry's detail carries a
//      `mappings.tmdb` id, so only entries that really belong to this TMDB title are kept
//   3. The entry is the latest one that started on/before the episode's air date; the episode number inside it is
//      counted from the first TMDB episode aired at its start (split cours, arcs as seasons, absolute numbering).
//      If the number does not fit the entry's episode count, nothing is returned rather than a wrong episode.
//   4. /anime/<id>/episode -> uid -> /ep/<uid>?origin=<id> -> streamLink -> stream.animeparadise.moe/m3u8 (no auth)

const API = 'https://api.animeparadise.moe';
const STREAM = 'https://stream.animeparadise.moe';
const SITE = 'https://www.animeparadise.moe';
const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB = 'https://api.themoviedb.org/3';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12000;
const DAY = 86400000;
const SLACK_DAYS = 3;     // TMDB and the site disagree by a day or two on air dates
const MAX_DETAILS = 12;   // candidate entries whose detail (tmdb mapping) is fetched

const API_HEADERS = { 'User-Agent': UA, 'Accept': 'application/json', 'Origin': SITE, 'Referer': SITE + '/' };
const PLAY_HEADERS = { 'User-Agent': UA, 'Origin': SITE, 'Referer': SITE + '/' };

function timeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
        promise.then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
}

function getJson(url, headers, label) {
    return timeout(fetch(url, { headers: headers }), TIMEOUT_MS, label).then(function (res) {
        if (!res.ok) throw new Error(label + ' HTTP ' + res.status);
        return res.json();
    });
}

function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseDate(s) {
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
}

function tmdbInfo(tmdbId, mediaType) {
    var kind = mediaType === 'tv' ? 'tv' : 'movie';
    return getJson(TMDB + '/' + kind + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&append_to_response=alternative_titles', {}, 'tmdb')
        .then(function (d) {
            var names = [d.name || d.title, d.original_name || d.original_title];
            var alts = (d.alternative_titles && (d.alternative_titles.results || d.alternative_titles.titles)) || [];
            alts.slice(0, 8).forEach(function (a) { names.push(a.title); });
            var seen = {};
            names = names.filter(function (n) { var k = norm(n); if (!k || seen[k]) return false; seen[k] = true; return true; });
            var info = { names: names, year: parseInt(String(d.first_air_date || d.release_date || '').slice(0, 4), 10) || 0 };
            if (mediaType !== 'tv') return info;
            var seasons = (d.seasons || []).filter(function (s) { return s.season_number > 0; });
            // every episode with its air date, in order (needed to count episodes inside an anime entry)
            return Promise.all(seasons.map(function (s) {
                return getJson(TMDB + '/tv/' + tmdbId + '/season/' + s.season_number + '?api_key=' + TMDB_KEY, {}, 'tmdb season')
                    .then(function (b) { return b.episodes || []; });
            })).then(function (lists) {
                info.episodes = [];
                lists.forEach(function (eps, i) {
                    eps.forEach(function (e) {
                        info.episodes.push({ season: seasons[i].season_number, number: e.episode_number, date: parseDate(e.air_date) });
                    });
                });
                return info;
            });
        });
}

function search(query) {
    return getJson(API + '/search?q=' + encodeURIComponent(query), API_HEADERS, 'search')
        .then(function (j) { return Array.isArray(j.data) ? j.data : []; })
        .catch(function () { return []; });
}

function detail(entry) {
    return getJson(API + '/anime/' + entry.link, API_HEADERS, 'detail')
        .then(function (j) { return j.data || null; })
        .catch(function () { return null; });
}

// Entries (from search) that the site itself maps to this TMDB id, with their detail attached.
function verifiedEntries(tmdbId, info) {
    return Promise.all(info.names.slice(0, 3).map(search)).then(function (lists) {
        var seen = {}, entries = [];
        lists.forEach(function (l) { l.forEach(function (e) { if (e.link && !seen[e.link]) { seen[e.link] = true; entries.push(e); } }); });
        return Promise.all(entries.slice(0, MAX_DETAILS).map(detail)).then(function (details) {
            var out = [];
            entries.slice(0, MAX_DETAILS).forEach(function (e, i) {
                var d = details[i];
                if (d && d.mappings && String(d.mappings.tmdb) === String(tmdbId)) out.push({ entry: e, detail: d });
            });
            return out;
        });
    });
}

function locateEpisode(info, season, episode, entries) {
    var list = info.episodes || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].season === season && list[i].number === episode) { idx = i; break; }
    if (idx < 0 || !list[idx].date) return null;
    var date = list[idx].date;

    var runs = entries.filter(function (x) {
        return /^(TV|ONA)$/i.test(x.detail.type || '') && parseDate(x.entry.startDate) && x.entry.episodes;
    }).map(function (x) { return { entry: x.entry, start: parseDate(x.entry.startDate) }; });
    // the latest entry that had started when the episode aired
    var started = runs.filter(function (r) { return r.start <= date + SLACK_DAYS * DAY; });
    if (!started.length) return null;
    started.sort(function (a, b) { return b.start - a.start; });
    if (started.length > 1 && started[0].start === started[1].start) return null;
    var run = started[0];

    var first = -1;
    for (var j = 0; j < list.length; j++) {
        if (list[j].date && list[j].date >= run.start - SLACK_DAYS * DAY) { first = j; break; }
    }
    if (first < 0 || first > idx) return null;
    var number = idx - first + 1;
    if (number > run.entry.episodes) return null;
    return { entry: run.entry, number: number };
}

function locateMovie(info, entries) {
    var hits = entries.filter(function (x) {
        if (!/movie/i.test(x.detail.type || '')) return false;
        var y = parseInt(String(x.entry.startDate || '').slice(0, 4), 10);
        return !info.year || !y || Math.abs(y - info.year) <= 1;
    });
    return hits.length === 1 ? { entry: hits[0].entry, number: 1 } : null;
}

function episodeStream(entry, number) {
    return getJson(API + '/anime/' + entry._id + '/episode', API_HEADERS, 'episodes').then(function (j) {
        var eps = j.data || [];
        var hit = null;
        eps.forEach(function (e) { if (String(e.number) === String(number)) hit = e; });
        if (!hit && eps.length === 1 && number === 1) hit = eps[0];
        if (!hit) return null;
        return getJson(API + '/ep/' + hit.uid + '?origin=' + entry._id, API_HEADERS, 'episode').then(function (r) {
            var ep = r.data && r.data.episode;
            if (!ep || !ep.streamLink) return null;
            var subtitles = (ep.subData || []).filter(function (s) { return s.type === 'vtt' && /^https?:/.test(s.src); }).map(function (s) {
                return { url: s.src, language: String(s.label || 'English').toLowerCase().slice(0, 2), name: s.label || 'English', headers: PLAY_HEADERS };
            });
            return { url: STREAM + '/m3u8?url=' + ep.streamLink, subtitles: subtitles };
        });
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
    var isTv = mediaType === 'tv';
    var s = isTv ? (season || 1) : 1;
    var e = isTv ? (episode || 1) : 1;
    return tmdbInfo(tmdbId, mediaType)
        .then(function (info) {
            return verifiedEntries(tmdbId, info).then(function (entries) {
                var hit = isTv ? locateEpisode(info, s, e, entries) : locateMovie(info, entries);
                if (!hit) return [];
                return episodeStream(hit.entry, hit.number).then(function (ep) {
                    if (!ep) return [];
                    return [{
                        name: 'AnimeParadise',
                        title: hit.entry.title + (isTv ? ' - Episode ' + hit.number : '') + ' (Sub)',
                        url: ep.url,
                        quality: 'Auto',
                        type: 'hls',
                        headers: PLAY_HEADERS,
                        subtitles: ep.subtitles,
                        provider: 'animeparadise'
                    }];
                });
            });
        })
        .catch(function (err) {
            console.error('[AnimeParadise] ' + err.message);
            return [];
        });
}

module.exports = { getStreams };
