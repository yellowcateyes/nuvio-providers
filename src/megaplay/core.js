// MegaPlay provider for Nuvio (anime, 1080p HLS, sub + dub, HiAnime-quality streams)
//
//   1. TMDB gives the show's names, every episode's air date and (for movies) the release year
//   2. AniList (GraphQL) lists the anime entries of the show with their MAL id, start/end dates and episode count
//   3. The entry is chosen by title + air date: the requested episode must have aired inside the entry's run.
//      The episode number inside the entry is counted from the first TMDB episode that aired at the entry's start
//      (this handles split cours, arcs listed as TMDB seasons and absolute numbering). Uncertain => nothing.
//   4. megaplay.buzz/stream/mal/<malId>/<n>/<sub|dub> -> internal file id -> getSources -> encrypted payload,
//      decrypted by enc-dec.app (the cipher lives in an obfuscated player script)

const MEGAPLAY = 'https://megaplay.buzz';
const ANILIST = 'https://graphql.anilist.co';
const DECRYPT = 'https://enc-dec.app/api/dec-megaplay';
const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB = 'https://api.themoviedb.org/3';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12000;
const DAY = 86400000;
const SLACK_DAYS = 3; // TMDB and AniList disagree by a day or two on air dates (time zones)

const MP_HEADERS = { 'User-Agent': UA, 'Origin': MEGAPLAY, 'Referer': MEGAPLAY + '/', 'X-Requested-With': 'XMLHttpRequest' };
const PLAY_HEADERS = { 'User-Agent': UA, 'Origin': MEGAPLAY, 'Referer': MEGAPLAY + '/' };

function timeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
        promise.then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
}

function request(url, options, label) {
    return timeout(fetch(url, options), TIMEOUT_MS, label).then(function (res) {
        if (!res.ok) throw new Error(label + ' HTTP ' + res.status);
        return res.text();
    });
}

function norm(s) {
    return String(s || '').toLowerCase().replace(/&amp;/g, '&').replace(/[×✕]/g, 'x').replace(/[^a-z0-9぀-ヿ一-鿿]+/g, '');
}

function toTime(d) {
    if (!d || !d.year) return null;
    return Date.UTC(d.year, (d.month || 1) - 1, d.day || 1);
}

function parseDate(s) {
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
}

function tmdbInfo(tmdbId, mediaType) {
    var kind = mediaType === 'tv' ? 'tv' : 'movie';
    return request(TMDB + '/' + kind + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&append_to_response=alternative_titles', {}, 'tmdb')
        .then(function (body) {
            var d = JSON.parse(body);
            var names = [d.name || d.title, d.original_name || d.original_title];
            var alts = (d.alternative_titles && (d.alternative_titles.results || d.alternative_titles.titles)) || [];
            alts.slice(0, 10).forEach(function (a) { names.push(a.title); });
            var seen = {};
            names = names.filter(function (n) { var k = norm(n); if (!k || seen[k]) return false; seen[k] = true; return true; });
            var info = {
                names: names,
                year: parseInt(String(d.first_air_date || d.release_date || '').slice(0, 4), 10) || 0,
                seasons: (d.seasons || []).filter(function (s) { return s.season_number > 0; })
            };
            if (mediaType !== 'tv') return info;
            // every episode with its air date, in order (needed to count episodes inside an anime entry)
            return Promise.all(info.seasons.map(function (s) {
                return request(TMDB + '/tv/' + tmdbId + '/season/' + s.season_number + '?api_key=' + TMDB_KEY, {}, 'tmdb season')
                    .then(function (b) { return JSON.parse(b).episodes || []; });
            })).then(function (lists) {
                info.episodes = [];
                lists.forEach(function (eps, i) {
                    eps.forEach(function (e) {
                        info.episodes.push({ season: info.seasons[i].season_number, number: e.episode_number, date: parseDate(e.air_date) });
                    });
                });
                return info;
            });
        });
}

var ANILIST_QUERY = 'query($q:String){Page(perPage:25){media(search:$q,type:ANIME,sort:SEARCH_MATCH){idMal format episodes ' +
    'startDate{year month day} endDate{year month day} title{romaji english native} synonyms}}}';

function searchAniList(query) {
    return request(ANILIST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: ANILIST_QUERY, variables: { q: query } })
    }, 'anilist').then(function (body) {
        var page = (JSON.parse(body).data || {}).Page || {};
        return (page.media || []).filter(function (m) { return m.idMal; });
    }).catch(function () { return []; });
}

function titlesOf(m) {
    var t = m.title || {};
    return [t.romaji, t.english, t.native].concat(m.synonyms || []).map(norm).filter(Boolean);
}

function matchesShow(m, baseNorms) {
    return titlesOf(m).some(function (t) {
        return baseNorms.some(function (b) { return b.length >= 4 && (t.indexOf(b) === 0 || (b.length >= 8 && t.indexOf(b) !== -1)); });
    });
}

function labelOf(m) {
    return m.title.english || m.title.romaji;
}

function locateMovie(info, entries) {
    var baseNorms = info.names.map(norm);
    var hits = entries.filter(function (m) {
        if (m.format !== 'MOVIE' || !m.startDate || !m.startDate.year) return false;
        if (info.year && Math.abs(m.startDate.year - info.year) > 1) return false;
        return titlesOf(m).some(function (t) { return baseNorms.indexOf(t) !== -1; });
    });
    hits.sort(function (a, b) { return Math.abs(a.startDate.year - info.year) - Math.abs(b.startDate.year - info.year); });
    return hits.length ? { mal: hits[0].idMal, number: 1, label: labelOf(hits[0]), alts: [] } : null;
}

function locateEpisode(info, season, episode, entries) {
    var baseNorms = info.names.map(norm);
    var list = info.episodes || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].season === season && list[i].number === episode) { idx = i; break; }
    if (idx < 0 || !list[idx].date) return null;
    var date = list[idx].date;

    var runs = entries.filter(function (m) {
        return /^(TV|TV_SHORT|ONA)$/.test(m.format || '') && matchesShow(m, baseNorms) && toTime(m.startDate);
    });
    // entries whose run (start .. end) covers the date the episode aired
    var covering = runs.filter(function (m) {
        var start = toTime(m.startDate), end = toTime(m.endDate) || (start + (m.episodes || 13) * 7 * DAY + 30 * DAY);
        return date >= start - SLACK_DAYS * DAY && date <= end + SLACK_DAYS * DAY;
    });
    if (!covering.length) return null;
    if (covering.length > 1) {
        // overlapping runs: the one that started last (closest to the episode) wins, unless two started together
        covering.sort(function (a, b) { return toTime(b.startDate) - toTime(a.startDate); });
        if (toTime(covering[0].startDate) === toTime(covering[1].startDate)) return null;
    }
    var entry = covering[0];

    // first TMDB episode of the entry = first one aired at/after the entry started
    var start = toTime(entry.startDate), first = -1;
    for (var j = 0; j < list.length; j++) {
        if (list[j].date && list[j].date >= start - SLACK_DAYS * DAY) { first = j; break; }
    }
    if (first < 0 || first > idx) return null;
    var number = idx - first + 1;
    if (entry.episodes && number > entry.episodes) return null;
    var hit = { mal: entry.idMal, number: number, label: labelOf(entry), alts: [] };
    // MegaPlay (like HiAnime) sometimes merges "Part 2" into the entry of Part 1 and numbers on: remember that as a fallback
    var parent = partParent(entry, runs);
    if (parent && parent.episodes) hit.alts.push({ mal: parent.idMal, number: number + parent.episodes, label: labelOf(parent) });
    return hit;
}

function stemOf(raw) {
    return String(raw || '').replace(/[\s:,-]*(\b(part|cour)\s*\d+|\b\d+(st|nd|rd|th)\s*(part|cour)|\b(second|2nd)\s*(part|cour))/gi, '').trim();
}

function partParent(entry, runs) {
    var stems = [entry.title.english, entry.title.romaji].filter(function (t) { return t && stemOf(t) !== t.trim(); }).map(function (t) { return norm(stemOf(t)); });
    if (!stems.length) return null;
    var start = toTime(entry.startDate);
    var parents = runs.filter(function (r) {
        var end = toTime(r.endDate);
        return r !== entry && end && end <= start && start - end < 200 * DAY && [r.title.english, r.title.romaji].some(function (t) { return stems.indexOf(norm(t)) !== -1; });
    });
    return parents.length === 1 ? parents[0] : null;
}

function decrypt(enc) {
    return request(DECRYPT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
        body: JSON.stringify({ text: enc })
    }, 'decrypt').then(function (body) {
        var j = JSON.parse(body);
        return j && j.status === 200 && j.result ? j.result : null;
    });
}

function voiceStream(mal, number, voice) {
    return request(MEGAPLAY + '/stream/mal/' + mal + '/' + number + '/' + voice, { headers: MP_HEADERS }, 'player page')
        .then(function (html) {
            var m = html.match(/<title>File (\d+) - MegaPlay<\/title>/);
            if (!m) return null;
            return request(MEGAPLAY + '/stream/getSources?id=' + m[1] + '&platform=OTHER', { headers: MP_HEADERS }, 'sources')
                .then(function (body) {
                    var src = JSON.parse(body);
                    if (!src.enc) return null;
                    return decrypt(src.enc).then(function (res) {
                        var file = res && (res.file || (res.sources && res.sources.file));
                        if (!file) return null;
                        var subtitles = (src.tracks || []).filter(function (t) { return t.file && /captions|subtitles/.test(t.kind || ''); }).map(function (t) {
                            return { url: t.file, language: String(t.label || 'English').toLowerCase().slice(0, 2), name: t.label || 'English', headers: PLAY_HEADERS };
                        });
                        return { url: file, subtitles: subtitles };
                    });
                });
        })
        .catch(function () { return null; });
}

// sub + dub streams of the located episode; falls back to the merged-parts numbering when the entry itself is unknown
function resolveVoices(hit) {
    var tries = [{ mal: hit.mal, number: hit.number, label: hit.label }].concat(hit.alts || []);
    function next(i) {
        if (i >= tries.length) return Promise.resolve([null, null, hit]);
        return Promise.all([voiceStream(tries[i].mal, tries[i].number, 'sub'), voiceStream(tries[i].mal, tries[i].number, 'dub')]).then(function (r) {
            return r[0] || r[1] ? r.concat([tries[i]]) : next(i + 1);
        });
    }
    return next(0);
}

function getStreams(tmdbId, mediaType, season, episode) {
    var isTv = mediaType === 'tv';
    var s = isTv ? (season || 1) : 1;
    var e = isTv ? (episode || 1) : 1;
    return tmdbInfo(tmdbId, mediaType)
        .then(function (info) {
            return Promise.all(info.names.slice(0, 3).map(searchAniList)).then(function (lists) {
                var seen = {}, entries = [];
                lists.forEach(function (l) { l.forEach(function (m) { if (!seen[m.idMal]) { seen[m.idMal] = true; entries.push(m); } }); });
                var hit = isTv ? locateEpisode(info, s, e, entries) : locateMovie(info, entries);
                if (!hit) return [];
                return resolveVoices(hit).then(function (r) {
                    var used = r[2] || hit, out = [];
                    ['Sub', 'Dub'].forEach(function (label, i) {
                        if (!r[i]) return;
                        out.push({
                            name: 'MegaPlay ' + label,
                            title: used.label + (isTv ? ' - Episode ' + used.number : '') + ' (' + label + ')',
                            url: r[i].url,
                            quality: 'Auto',
                            type: 'hls',
                            headers: PLAY_HEADERS,
                            subtitles: r[i].subtitles,
                            provider: 'megaplay'
                        });
                    });
                    return out;
                });
            });
        })
        .catch(function (err) {
            console.error('[MegaPlay] ' + err.message);
            return [];
        });
}

module.exports = { getStreams };
