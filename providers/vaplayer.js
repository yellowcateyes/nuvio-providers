// VAPlayer provider for Nuvio
// Looks up the IMDb id on TMDB, asks streamdata.vaplayer.ru for HLS playlists and
// returns them with the Referer/Origin the CDN expects.

const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_URL = 'https://streamdata.vaplayer.ru/api.php';
const REFERER_ORIGIN = 'https://nextgencloudfabric.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const STREAM_HEADERS = {
    'User-Agent': USER_AGENT,
    'Referer': REFERER_ORIGIN + '/',
    'Origin': REFERER_ORIGIN
};

function getJson(url, headers) {
    return fetch(url, { headers: headers || { 'User-Agent': USER_AGENT, 'Accept': 'application/json' } })
        .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url.split('?')[0]);
            return res.json();
        });
}

function getImdbAndTitle(tmdbId, mediaType) {
    var kind = mediaType === 'tv' ? 'tv' : 'movie';
    return getJson(TMDB_BASE_URL + '/' + kind + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&append_to_response=external_ids')
        .then(function (d) {
            return {
                imdbId: d.imdb_id || (d.external_ids && d.external_ids.imdb_id) || null,
                title: d.title || d.name || 'Unknown',
                year: ((d.release_date || d.first_air_date || '').split('-')[0]) || ''
            };
        });
}

function qualityFromPlaylist(url) {
    // The playlist URL carries no quality, so read the master playlist's top variant.
    return fetch(url, { headers: STREAM_HEADERS })
        .then(function (res) { return res.ok ? res.text() : ''; })
        .then(function (text) {
            // Widescreen films are letterboxed (1920x800 is still 1080p), so classify by width.
            var best = 0;
            var re = /RESOLUTION=(\d+)x\d+/g, m;
            while ((m = re.exec(text))) best = Math.max(best, parseInt(m[1], 10));
            if (!best) return 'Auto';
            if (best >= 3800) return '2160p';
            if (best >= 1900) return '1080p';
            if (best >= 1260) return '720p';
            if (best >= 840) return '480p';
            return '360p';
        })
        .catch(function () { return 'Auto'; });
}

function getStreams(tmdbId, mediaType, season, episode) {
    return getImdbAndTitle(tmdbId, mediaType)
        .then(function (info) {
            if (!info.imdbId) return [];
            var q = 'imdb=' + encodeURIComponent(info.imdbId) + '&type=' + (mediaType === 'tv' ? 'series' : 'movie');
            if (mediaType === 'tv') q += '&season=' + (season || 1) + '&episode=' + (episode || 1);
            return getJson(API_URL + '?' + q, {
                'User-Agent': USER_AGENT, 'Accept': 'application/json',
                'Referer': REFERER_ORIGIN + '/', 'Origin': REFERER_ORIGIN
            }).then(function (data) {
                var urls = data && String(data.status_code) === '200' && data.data && data.data.stream_urls;
                if (!Array.isArray(urls) || !urls.length) return [];
                var label = info.title + (info.year ? ' (' + info.year + ')' : '') +
                    (mediaType === 'tv' ? ' S' + String(season).padStart(2, '0') + 'E' + String(episode).padStart(2, '0') : '');
                return Promise.all(urls.map(function (u, i) {
                    return qualityFromPlaylist(u).then(function (quality) {
                        return {
                            name: 'VAPlayer' + (urls.length > 1 ? ' #' + (i + 1) : ''),
                            title: label,
                            url: u,
                            quality: quality,
                            headers: STREAM_HEADERS,
                            provider: 'vaplayer'
                        };
                    });
                }));
            });
        })
        .catch(function (err) {
            console.error('[VAPlayer] ' + err.message);
            return [];
        });
}

module.exports = { getStreams };
