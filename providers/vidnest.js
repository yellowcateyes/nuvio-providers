/**
 * vidnest - Built from src/vidnest/
 * Generated: 2026-10-06T05:58:24.106Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/vidnest/core.js
var require_core = __commonJS({
  "src/vidnest/core.js"(exports2, module2) {
    var API = "https://new.vidnest.fun";
    var TMDB = "https://api.themoviedb.org/3";
    var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
    var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
    var TIMEOUT_MS = 12e3;
    var ALPHABET = "RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=";
    var SITE_HEADERS = { "Accept": "*/*", "Origin": "https://vidnest.fun", "Referer": "https://vidnest.fun/", "User-Agent": UA };
    var SERVERS = [
      { label: "Zeta", path: "nextgencloudfabric" },
      { label: "Gama", path: "vidzee" }
    ];
    function timeout(promise, ms, label) {
      return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
          reject(new Error(label + " timed out"));
        }, ms);
        promise.then(function(v) {
          clearTimeout(timer);
          resolve(v);
        }, function(e) {
          clearTimeout(timer);
          reject(e);
        });
      });
    }
    function fetchJson(url, options, label) {
      return timeout(fetch(url, options), TIMEOUT_MS, label).then(function(res) {
        if (!res.ok)
          throw new Error(label + " HTTP " + res.status);
        return res.json();
      });
    }
    function decodeCipher(text) {
      var map = {};
      for (var i = 0; i < ALPHABET.length; i++)
        map[ALPHABET.charAt(i)] = i;
      var bytes = [];
      for (var p = 0; p < text.length; p += 4) {
        var chunk = text.substr(p, 4);
        while (chunk.length < 4)
          chunk += "=";
        var v = [];
        for (var j = 0; j < 4; j++) {
          var t = map[chunk.charAt(j)];
          v.push(t === void 0 ? 64 : t);
        }
        bytes.push(v[0] << 2 | v[1] >> 4);
        if (v[2] !== 64)
          bytes.push((v[1] & 15) << 4 | v[2] >> 2);
        if (v[3] !== 64)
          bytes.push((v[2] & 3) << 6 | v[3]);
      }
      var out = "";
      for (var k = 0; k < bytes.length; k++)
        out += "%" + ("0" + (bytes[k] & 255).toString(16)).slice(-2);
      try {
        return decodeURIComponent(out);
      } catch (e) {
        var raw = "";
        for (var m = 0; m < bytes.length; m++)
          raw += String.fromCharCode(bytes[m] & 255);
        return raw;
      }
    }
    function isEnglish(lang) {
      if (!lang)
        return true;
      return /^(en|english|multi|original|auto)/i.test(String(lang).trim());
    }
    function tmdbLabel(tmdbId, mediaType) {
      return fetchJson(TMDB + "/" + (mediaType === "tv" ? "tv" : "movie") + "/" + tmdbId + "?api_key=" + TMDB_KEY, { headers: { "User-Agent": UA } }, "TMDB").then(function(d) {
        var date = d.release_date || d.first_air_date || "";
        return (d.title || d.name || "") + (date ? " (" + date.slice(0, 4) + ")" : "");
      }).catch(function() {
        return "";
      });
    }
    function fetchServer(server, tmdbId, mediaType, season, episode) {
      var url = API + "/" + server.path + "/" + (mediaType === "tv" ? "tv/" + tmdbId + "/" + season + "/" + episode : "movie/" + tmdbId);
      return fetchJson(url, { headers: SITE_HEADERS }, server.label).then(function(j) {
        if (j && j.encrypted && typeof j.data === "string")
          j = JSON.parse(decodeCipher(j.data));
        if (!j)
          return [];
        var items = [];
        if (Array.isArray(j.streams)) {
          j.streams.forEach(function(s) {
            if (s && s.url && isEnglish(s.language))
              items.push({ url: s.url, headers: s.headers, type: s.type, language: s.language });
          });
        } else if (j.url) {
          items.push({ url: j.url, headers: j.headers });
          (Array.isArray(j.all_urls) ? j.all_urls : []).slice(0, 2).forEach(function(u) {
            if (u && u !== j.url)
              items.push({ url: u, headers: j.headers });
          });
        }
        return items.map(function(it) {
          var isMp4 = it.type === "mp4" || /\.(mp4|mkv)(\?|$)/i.test(it.url);
          var headers = {};
          var src = it.headers && typeof it.headers === "object" ? it.headers : {};
          for (var k in src)
            headers[String(k).trim()] = String(src[k]).trim();
          if (!headers["User-Agent"])
            headers["User-Agent"] = UA;
          return { server: server.label, url: String(it.url).replace(/\s+/g, ""), headers, isMp4 };
        });
      }).catch(function() {
        return [];
      });
    }
    function getStreams2(tmdbId, mediaType, season, episode) {
      mediaType = mediaType === "tv" ? "tv" : "movie";
      return Promise.all([
        tmdbLabel(tmdbId, mediaType),
        Promise.all(SERVERS.map(function(s) {
          return fetchServer(s, tmdbId, mediaType, season, episode);
        }))
      ]).then(function(res) {
        var title = res[0] + (mediaType === "tv" ? " S" + String(season).padStart(2, "0") + "E" + String(episode).padStart(2, "0") : "");
        var out = [];
        res[1].forEach(function(list) {
          list.forEach(function(s) {
            out.push({
              name: "VidNest " + s.server,
              title,
              url: s.url,
              quality: "Auto",
              type: s.isMp4 ? void 0 : "hls",
              headers: s.headers,
              subtitles: [],
              provider: "vidnest"
            });
          });
        });
        return out;
      }).catch(function(err) {
        console.error("[VidNest] " + err.message);
        return [];
      });
    }
    module2.exports = { getStreams: getStreams2 };
  }
});

// src/_shared/validate.js
var require_validate = __commonJS({
  "src/_shared/validate.js"(exports2, module2) {
    var CHECK_TIMEOUT_MS = 7e3;
    var OVERALL_TIMEOUT_MS = 15e3;
    var CONCURRENCY = 10;
    var DEFAULT_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36";
    function withTimeout(promise, ms, label) {
      return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
          reject(new Error(label + " timed out"));
        }, ms);
        promise.then(function(v) {
          clearTimeout(timer);
          resolve(v);
        }, function(e) {
          clearTimeout(timer);
          reject(e);
        });
      });
    }
    function resolveUrl(ref, base) {
      if (/^https?:\/\//i.test(ref))
        return ref;
      var m = base.match(/^(https?:\/\/[^\/?#]+)([^?#]*)/i);
      if (!m)
        return ref;
      if (ref.indexOf("//") === 0)
        return base.split(":")[0] + ":" + ref;
      if (ref.charAt(0) === "/")
        return m[1] + ref;
      return m[1] + m[2].replace(/[^\/]*$/, "") + ref;
    }
    function normalizeUrl(url) {
      return String(url).replace(/[^\x21-\x7E]|[ "<>\\^`{|}\[\]]/g, function(c) {
        return encodeURIComponent(c);
      });
    }
    function qualityFromWidth(width) {
      if (width >= 3800)
        return "2160p";
      if (width >= 1900)
        return "1080p";
      if (width >= 1260)
        return "720p";
      if (width >= 840)
        return "480p";
      return "360p";
    }
    function qualityNumber(q) {
      var s = String(q || "").toLowerCase();
      if (/4k|uhd/.test(s))
        return 2160;
      var m = s.match(/(\d{3,4})\s*p?/);
      return m ? parseInt(m[1], 10) : 0;
    }
    function mergeHeaders(stream, extra) {
      var h = { "User-Agent": DEFAULT_UA };
      var own = stream.headers || {};
      for (var k in own)
        h[k] = own[k];
      for (var e in extra || {})
        h[e] = extra[e];
      return h;
    }
    function probeHls(stream) {
      var headers = mergeHeaders(stream);
      return fetch(stream.url, { headers }).then(function(res) {
        if (!res.ok)
          throw new Error("playlist HTTP " + res.status);
        return res.text();
      }).then(function(text) {
        if (text.indexOf("#EXTM3U") === -1)
          throw new Error("not an HLS playlist");
        var lines = text.split("\n").map(function(l) {
          return l.trim();
        });
        var best = null, bestBw = -1, maxWidth = 0;
        for (var i = 0; i < lines.length; i++) {
          var m = lines[i].match(/^#EXT-X-STREAM-INF:(.*)$/);
          if (!m)
            continue;
          var bw = (m[1].match(/BANDWIDTH=(\d+)/) || [0, 0])[1] | 0;
          var w = (m[1].match(/RESOLUTION=(\d+)x\d+/) || [0, 0])[1] | 0;
          if (w > maxWidth)
            maxWidth = w;
          if (bw > bestBw && lines[i + 1] && lines[i + 1].charAt(0) !== "#") {
            bestBw = bw;
            best = lines[i + 1];
          }
        }
        var mediaUrl = stream.url;
        var mediaPromise = Promise.resolve(text);
        if (best) {
          mediaUrl = resolveUrl(best, stream.url);
          mediaPromise = fetch(mediaUrl, { headers }).then(function(r) {
            if (!r.ok)
              throw new Error("variant HTTP " + r.status);
            return r.text();
          });
        }
        return mediaPromise.then(function(media) {
          var seg = null;
          var ml = media.split("\n");
          for (var j = 0; j < ml.length; j++) {
            var l = ml[j].trim();
            if (l && l.charAt(0) !== "#") {
              seg = l;
              break;
            }
          }
          if (!seg)
            throw new Error("playlist has no segments");
          var segHeaders = mergeHeaders(stream, { Range: "bytes=0-65535" });
          var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
          var opts = { headers: segHeaders };
          if (controller)
            opts.signal = controller.signal;
          return fetch(resolveUrl(seg, mediaUrl), opts).then(function(r) {
            if (!(r.status === 200 || r.status === 206))
              throw new Error("segment HTTP " + r.status);
            var len = parseInt(r.headers.get("content-length") || "0", 10);
            if (len && len < 1e3)
              throw new Error("segment too small");
            if (controller) {
              controller.abort();
              return { height: maxWidth ? qualityFromWidth(maxWidth) : null };
            }
            return r.arrayBuffer().then(function(buf) {
              if (buf.byteLength < 1e3)
                throw new Error("segment too small");
              return { height: maxWidth ? qualityFromWidth(maxWidth) : null };
            });
          });
        });
      });
    }
    function isVideoBytes(buf, contentType) {
      var b = new Uint8Array(buf);
      var mp4 = b.length > 8 && b[4] === 102 && b[5] === 116 && b[6] === 121 && b[7] === 112;
      var mkv = b.length > 4 && b[0] === 26 && b[1] === 69 && b[2] === 223 && b[3] === 163;
      var ts = b.length > 188 && b[0] === 71 && b[188] === 71;
      return mp4 || mkv || ts || /^video\//i.test(contentType || "");
    }
    function probeDirect(stream) {
      var headers = mergeHeaders(stream, { Range: "bytes=0-2047" });
      return fetch(stream.url, { headers }).then(function(res) {
        if (!(res.status === 200 || res.status === 206))
          throw new Error("HTTP " + res.status);
        var ct = res.headers.get("content-type") || "";
        if (/text\/html|application\/json/i.test(ct))
          throw new Error("web page, not video");
        return res.arrayBuffer().then(function(buf) {
          if (!isVideoBytes(buf, ct))
            throw new Error("not video data");
          return { height: null };
        });
      });
    }
    function probe(stream) {
      var started = Date.now();
      var isHls = /\.m3u8(\?|#|$)/i.test(stream.url) || stream.type === "hls";
      return withTimeout(isHls ? probeHls(stream) : probeDirect(stream), CHECK_TIMEOUT_MS, "check").then(function(r) {
        return { ok: true, ms: Date.now() - started, quality: r.height };
      }).catch(function(e) {
        return { ok: false, ms: Date.now() - started, why: e.message };
      });
    }
    function validateStreams2(streams, options) {
      options = options || {};
      if (!Array.isArray(streams) || streams.length === 0)
        return Promise.resolve(streams || []);
      var seen = {};
      var unique = streams.filter(function(s) {
        if (!s || typeof s.url !== "string" || !/^https?:\/\//i.test(s.url))
          return false;
        var key = normalizeUrl(s.url);
        if (seen[key])
          return false;
        seen[key] = true;
        return true;
      }).map(function(s) {
        var c = {};
        for (var k in s)
          c[k] = s[k];
        c.url = normalizeUrl(s.url);
        return c;
      });
      var results = new Array(unique.length);
      var next = 0;
      var deadline = Date.now() + (options.overallTimeout || OVERALL_TIMEOUT_MS);
      function worker() {
        if (next >= unique.length || Date.now() >= deadline)
          return Promise.resolve();
        var i = next++;
        return probe(unique[i]).then(function(r) {
          results[i] = r;
          return worker();
        });
      }
      var workers = [];
      for (var w = 0; w < Math.min(CONCURRENCY, unique.length); w++)
        workers.push(worker());
      return withTimeout(Promise.all(workers), (options.overallTimeout || OVERALL_TIMEOUT_MS) + 2e3, "validation").catch(function() {
      }).then(function() {
        var kept = [];
        for (var i = 0; i < unique.length; i++) {
          var r = results[i];
          if (!r || !r.ok)
            continue;
          var s = unique[i];
          var out = {};
          for (var k in s)
            out[k] = s[k];
          if (r.quality && !qualityNumber(s.quality))
            out.quality = r.quality;
          out._ms = r.ms;
          kept.push(out);
        }
        kept.sort(function(a, b) {
          var qa = qualityNumber(a.quality), qb = qualityNumber(b.quality);
          if (qa !== qb)
            return qb - qa;
          return a._ms - b._ms;
        });
        kept.forEach(function(s2) {
          delete s2._ms;
        });
        return kept;
      }).catch(function() {
        return streams;
      });
    }
    function dropWrongYear2(streams, tmdbId, mediaType) {
      if (mediaType !== "movie" || !Array.isArray(streams) || streams.length === 0)
        return Promise.resolve(streams);
      return fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=439c478a771f35c05022f9feabcca01c").then(function(r) {
        return r.json();
      }).then(function(d) {
        var year = parseInt(String(d.release_date || "").slice(0, 4), 10);
        if (!year)
          return streams;
        return streams.filter(function(st) {
          var m = String(st.title || "").match(/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/);
          return !m || Math.abs(parseInt(m[1], 10) - year) <= 1;
        });
      }).catch(function() {
        return streams;
      });
    }
    var INDIAN_LANG = /(^|[^a-z])(hindi|hin|tamil|tam|telugu|tel|malayalam|mal|kannada|kan|bengali|punjabi|marathi|bollywood|desi)([^a-z]|$)/i;
    function dropIndianLanguages2(streams) {
      if (!Array.isArray(streams))
        return streams;
      return streams.filter(function(st) {
        var text = [st.name, st.title, st.language, st.lang, st.url].map(function(v) {
          var t = String(v || "");
          try {
            t = decodeURIComponent(t);
          } catch (e) {
          }
          return t;
        }).join(" ");
        return !INDIAN_LANG.test(text);
      });
    }
    module2.exports = { validateStreams: validateStreams2, dropWrongYear: dropWrongYear2, dropIndianLanguages: dropIndianLanguages2 };
  }
});

// src/vidnest/index.js
var { getStreams: scrape } = require_core();
var { validateStreams, dropWrongYear, dropIndianLanguages } = require_validate();
function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve(scrape(tmdbId, mediaType, season, episode)).then(function(streams) {
    return dropWrongYear(dropIndianLanguages(streams), tmdbId, mediaType);
  }).then(function(streams) {
    return validateStreams(streams);
  });
}
module.exports = { getStreams };
