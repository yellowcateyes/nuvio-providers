/**
 * Shared stream validation for providers.
 *
 * Providers scrape links that are often dead, expired, geo-blocked or just web
 * pages. Showing those makes users hop between providers, so every provider
 * pipes its results through validateStreams(): each stream is probed on the
 * user's own network, dead ones are dropped, and what's left is ordered best
 * quality first and fastest first.
 *
 * Only fetch + core language features are used so it runs in React Native (Hermes).
 */

const CHECK_TIMEOUT_MS = 7000;   // per stream
const OVERALL_TIMEOUT_MS = 15000; // for the whole batch
const CONCURRENCY = 10;
const DEFAULT_UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';

function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
        promise.then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
}

// Resolve a playlist entry against the playlist URL without relying on URL (limited in React Native).
function resolveUrl(ref, base) {
    if (/^https?:\/\//i.test(ref)) return ref;
    var m = base.match(/^(https?:\/\/[^\/?#]+)([^?#]*)/i);
    if (!m) return ref;
    if (ref.indexOf('//') === 0) return base.split(':')[0] + ':' + ref;
    if (ref.charAt(0) === '/') return m[1] + ref;
    return m[1] + m[2].replace(/[^\/]*$/, '') + ref;
}

function qualityFromWidth(width) {
    if (width >= 3800) return '2160p';
    if (width >= 1900) return '1080p';
    if (width >= 1260) return '720p';
    if (width >= 840) return '480p';
    return '360p';
}

function qualityNumber(q) {
    var s = String(q || '').toLowerCase();
    if (/4k|uhd/.test(s)) return 2160;
    var m = s.match(/(\d{3,4})\s*p?/);
    return m ? parseInt(m[1], 10) : 0;
}

function mergeHeaders(stream, extra) {
    var h = { 'User-Agent': DEFAULT_UA };
    var own = stream.headers || {};
    for (var k in own) h[k] = own[k];
    for (var e in (extra || {})) h[e] = extra[e];
    return h;
}

function probeHls(stream) {
    var headers = mergeHeaders(stream);
    return fetch(stream.url, { headers: headers }).then(function (res) {
        if (!res.ok) throw new Error('playlist HTTP ' + res.status);
        return res.text();
    }).then(function (text) {
        if (text.indexOf('#EXTM3U') === -1) throw new Error('not an HLS playlist');
        var lines = text.split('\n').map(function (l) { return l.trim(); });
        var best = null, bestBw = -1, maxWidth = 0;
        for (var i = 0; i < lines.length; i++) {
            var m = lines[i].match(/^#EXT-X-STREAM-INF:(.*)$/);
            if (!m) continue;
            var bw = (m[1].match(/BANDWIDTH=(\d+)/) || [0, 0])[1] | 0;
            var w = (m[1].match(/RESOLUTION=(\d+)x\d+/) || [0, 0])[1] | 0;
            if (w > maxWidth) maxWidth = w;
            if (bw > bestBw && lines[i + 1] && lines[i + 1].charAt(0) !== '#') { bestBw = bw; best = lines[i + 1]; }
        }
        var mediaUrl = stream.url;
        var mediaPromise = Promise.resolve(text);
        if (best) {
            mediaUrl = resolveUrl(best, stream.url);
            mediaPromise = fetch(mediaUrl, { headers: headers }).then(function (r) {
                if (!r.ok) throw new Error('variant HTTP ' + r.status);
                return r.text();
            });
        }
        return mediaPromise.then(function (media) {
            var seg = null;
            var ml = media.split('\n');
            for (var j = 0; j < ml.length; j++) {
                var l = ml[j].trim();
                if (l && l.charAt(0) !== '#') { seg = l; break; }
            }
            if (!seg) throw new Error('playlist has no segments');
            var segHeaders = mergeHeaders(stream, { Range: 'bytes=0-65535' });
            // Some CDNs ignore Range and would stream the whole segment, so judge by the response
            // headers and abort the body instead of downloading it.
            var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            var opts = { headers: segHeaders };
            if (controller) opts.signal = controller.signal;
            return fetch(resolveUrl(seg, mediaUrl), opts).then(function (r) {
                if (!(r.status === 200 || r.status === 206)) throw new Error('segment HTTP ' + r.status);
                // content-type is not checked here: some CDNs label real segments text/html or image/*
                var len = parseInt(r.headers.get('content-length') || '0', 10);
                if (len && len < 1000) throw new Error('segment too small');
                if (controller) { controller.abort(); return { height: maxWidth ? qualityFromWidth(maxWidth) : null }; }
                return r.arrayBuffer().then(function (buf) {
                    if (buf.byteLength < 1000) throw new Error('segment too small');
                    return { height: maxWidth ? qualityFromWidth(maxWidth) : null };
                });
            });
        });
    });
}

function isVideoBytes(buf, contentType) {
    var b = new Uint8Array(buf);
    var mp4 = b.length > 8 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
    var mkv = b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    var ts = b.length > 188 && b[0] === 0x47 && b[188] === 0x47;
    return mp4 || mkv || ts || /^video\//i.test(contentType || '');
}

function probeDirect(stream) {
    var headers = mergeHeaders(stream, { Range: 'bytes=0-2047' });
    return fetch(stream.url, { headers: headers }).then(function (res) {
        if (!(res.status === 200 || res.status === 206)) throw new Error('HTTP ' + res.status);
        var ct = res.headers.get('content-type') || '';
        if (/text\/html|application\/json/i.test(ct)) throw new Error('web page, not video');
        return res.arrayBuffer().then(function (buf) {
            if (!isVideoBytes(buf, ct)) throw new Error('not video data');
            return { height: null };
        });
    });
}

function probe(stream) {
    var started = Date.now();
    var isHls = /\.m3u8(\?|#|$)/i.test(stream.url) || stream.type === 'hls';
    return withTimeout(isHls ? probeHls(stream) : probeDirect(stream), CHECK_TIMEOUT_MS, 'check').then(function (r) {
        return { ok: true, ms: Date.now() - started, quality: r.height };
    }).catch(function (e) {
        return { ok: false, ms: Date.now() - started, why: e.message };
    });
}

/**
 * Keep only streams that actually respond, order them best-quality-first then fastest-first.
 * Never throws: on any internal error the original list is returned untouched.
 */
function validateStreams(streams, options) {
    options = options || {};
    if (!Array.isArray(streams) || streams.length === 0) return Promise.resolve(streams || []);
    var seen = {};
    var unique = streams.filter(function (s) {
        if (!s || typeof s.url !== 'string' || !/^https?:\/\//i.test(s.url)) return false;
        if (seen[s.url]) return false;
        seen[s.url] = true;
        return true;
    });
    var results = new Array(unique.length);
    var next = 0;
    var deadline = Date.now() + (options.overallTimeout || OVERALL_TIMEOUT_MS);

    function worker() {
        if (next >= unique.length || Date.now() >= deadline) return Promise.resolve();
        var i = next++;
        return probe(unique[i]).then(function (r) { results[i] = r; return worker(); });
    }
    var workers = [];
    for (var w = 0; w < Math.min(CONCURRENCY, unique.length); w++) workers.push(worker());

    return withTimeout(Promise.all(workers), (options.overallTimeout || OVERALL_TIMEOUT_MS) + 2000, 'validation')
        .catch(function () { /* use whatever finished */ })
        .then(function () {
            var kept = [];
            for (var i = 0; i < unique.length; i++) {
                var r = results[i];
                if (!r || !r.ok) continue;
                var s = unique[i];
                var out = {};
                for (var k in s) out[k] = s[k];
                if (r.quality && !qualityNumber(s.quality)) out.quality = r.quality;
                out._ms = r.ms;
                kept.push(out);
            }
            kept.sort(function (a, b) {
                var qa = qualityNumber(a.quality), qb = qualityNumber(b.quality);
                if (qa !== qb) return qb - qa;
                return a._ms - b._ms;
            });
            kept.forEach(function (s) { delete s._ms; });
            return kept;
        })
        .catch(function () { return streams; });
}

module.exports = { validateStreams };
