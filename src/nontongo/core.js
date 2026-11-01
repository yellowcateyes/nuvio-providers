// NontonGo provider for Nuvio
// nontongo.win serves TMDB-keyed embeds. Its "01aus" player page lists the HLS masters
// (Quercus / Acer / Salix) already resolved and proxied through svsoapp.nontongo.win; no
// token exchange or decryption is needed, only the site Referer ("Unauthorized Domain" otherwise).

const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const SITE = 'https://nontongo.win';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

const PLAY_HEADERS = {
    'User-Agent': USER_AGENT,
    'Referer': SITE + '/',
    'Origin': SITE
};

function getText(url, headers) {
    return fetch(url, { headers: headers || PLAY_HEADERS }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url.split('?')[0]);
        return res.text();
    });
}

function getTitle(tmdbId, mediaType) {
    var kind = mediaType === 'tv' ? 'tv' : 'movie';
    return getText(TMDB_BASE_URL + '/' + kind + '/' + tmdbId + '?api_key=' + TMDB_API_KEY, { 'User-Agent': USER_AGENT })
        .then(function (t) {
            var d = JSON.parse(t);
            var year = ((d.release_date || d.first_air_date || '').split('-')[0]) || '';
            return (d.title || d.name || 'Unknown') + (year ? ' (' + year + ')' : '');
        })
        .catch(function () { return 'NontonGo'; });
}

function decodeEntities(s) {
    return String(s).replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');
}

function qualityFromMaster(masterText) {
    // Widescreen films are letterboxed (1920x800 is still 1080p), so classify by width.
    var best = 0, re = /RESOLUTION=(\d+)x\d+/g, m;
    while ((m = re.exec(masterText))) best = Math.max(best, parseInt(m[1], 10));
    if (!best) return 'Auto';
    if (best >= 3800) return '2160p';
    if (best >= 1900) return '1080p';
    if (best >= 1260) return '720p';
    if (best >= 840) return '480p';
    return '360p';
}

function parseSubtitles(html) {
    var subs = [], re = /<track[^>]*data-src="([^"]+)"[^>]*label="([^"]*)"/g, m;
    while ((m = re.exec(html))) {
        if (/^English/i.test(m[2])) subs.push({ url: decodeEntities(m[1]), language: 'en', name: m[2] });
    }
    return subs;
}

function getStreams(tmdbId, mediaType, season, episode) {
    var isTv = mediaType === 'tv';
    var url = SITE + '/01aus/player.php?id=' + encodeURIComponent(tmdbId) + '&type=' + (isTv ? 'tv' : 'movie') +
        (isTv ? '&season=' + (season || 1) + '&episode=' + (episode || 1) : '') + '&autoplay=true';
    return Promise.all([getText(url), getTitle(tmdbId, mediaType)])
        .then(function (r) {
            var html = r[0];
            var label = r[1] + (isTv ? ' S' + String(season).padStart(2, '0') + 'E' + String(episode).padStart(2, '0') : '');
            var subtitles = parseSubtitles(html);
            var servers = [], re = /data-url="(https:\/\/svsoapp\.nontongo\.win\/bl\/[^"]+)"[^>]*>\s*([^<]*?)\s*</g, m;
            while ((m = re.exec(html))) servers.push({ url: decodeEntities(m[1]), name: m[2].replace(/\s*·.*$/, '') || 'Server' });
            return Promise.all(servers.map(function (s) {
                return getText(s.url).then(function (master) {
                    if (master.indexOf('#EXTM3U') !== 0) return null;
                    return {
                        name: 'NontonGo ' + s.name,
                        title: label,
                        url: s.url,
                        quality: qualityFromMaster(master),
                        type: 'hls',
                        headers: PLAY_HEADERS,
                        subtitles: subtitles,
                        provider: 'nontongo'
                    };
                }).catch(function () { return null; }); // a dead mirror must not sink the rest
            }));
        })
        .then(function (streams) { return streams.filter(Boolean); })
        .catch(function (err) {
            console.error('[NontonGo] ' + err.message);
            return [];
        });
}

module.exports = { getStreams };
