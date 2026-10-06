/**
 * cinejoy - Built from src/cinejoy/
 * Generated: 2026-10-06T05:34:09.975Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/cinejoy/core.js
var require_core = __commonJS({
  "src/cinejoy/core.js"(exports2, module2) {
    var API = "https://api.wing.st";
    var ENC_DEC = "https://enc-dec.app/api";
    var TMDB = "https://api.themoviedb.org/3";
    var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
    var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
    var TIMEOUT_MS = 15e3;
    var FALLBACK_SERVERS = ["Nebula", "Lisbon", "Solara"];
    var SITE_HEADERS = { "Accept": "*/*", "Origin": "https://cinejoy.pk", "Referer": "https://cinejoy.pk/", "User-Agent": UA };
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
    function json(url, options, label) {
      return timeout(fetch(url, options), TIMEOUT_MS, label).then(function(res) {
        if (!res.ok)
          throw new Error(label + " HTTP " + res.status);
        return res.json();
      });
    }
    var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    function toBase64Url(bytes) {
      var out = "";
      for (var i = 0; i < bytes.length; i += 3) {
        var n = bytes[i] << 16 | (bytes[i + 1] || 0) << 8 | (bytes[i + 2] || 0);
        out += B64[n >> 18 & 63] + B64[n >> 12 & 63];
        if (i + 1 < bytes.length)
          out += B64[n >> 6 & 63];
        if (i + 2 < bytes.length)
          out += B64[n & 63];
      }
      return out;
    }
    function fromBase64Url(str) {
      var clean = String(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      var bytes = [];
      for (var i = 0; i < clean.length; i += 4) {
        var a = B64.indexOf(clean[i]), b = B64.indexOf(clean[i + 1]);
        var c = i + 2 < clean.length ? B64.indexOf(clean[i + 2]) : -1;
        var d = i + 3 < clean.length ? B64.indexOf(clean[i + 3]) : -1;
        bytes.push((a << 2 | b >> 4) & 255);
        if (c >= 0)
          bytes.push((b << 4 | c >> 2) & 255);
        if (d >= 0)
          bytes.push((c << 6 | d) & 255);
      }
      return new Uint8Array(bytes);
    }
    function tmdbInfo(tmdbId, mediaType) {
      var kind = mediaType === "tv" ? "tv" : "movie";
      return json(TMDB + "/" + kind + "/" + tmdbId + "?api_key=" + TMDB_KEY + "&append_to_response=external_ids", { headers: { "User-Agent": UA } }, "tmdb").then(function(d) {
        return {
          title: d.name || d.title,
          year: String(d.first_air_date || d.release_date || "").slice(0, 4),
          imdb: d.imdb_id || d.external_ids && d.external_ids.imdb_id || ""
        };
      });
    }
    function listServers() {
      return json(API + "/servers", { headers: SITE_HEADERS }, "servers").then(function(j) {
        return (j.servers || []).map(function(s) {
          return s.name;
        }).filter(Boolean);
      }).catch(function() {
        return FALLBACK_SERVERS;
      });
    }
    function query(info, tmdbId, mediaType, season, episode, server) {
      var parts = [
        "title=" + encodeURIComponent(info.title),
        "type=" + (mediaType === "tv" ? "series" : "movie"),
        "year=" + info.year,
        "imdb=" + info.imdb,
        "tmdb=" + tmdbId,
        "server=" + encodeURIComponent(server)
      ];
      if (mediaType === "tv")
        parts.push("season=" + season, "episode=" + episode);
      return API + "/?" + parts.join("&");
    }
    function fetchServer(info, tmdbId, mediaType, season, episode, server) {
      var lookup = query(info, tmdbId, mediaType, season, episode, server);
      return json(ENC_DEC + "/enc-cinejoy?url=" + encodeURIComponent(lookup), { headers: { "User-Agent": UA } }, "enc-cinejoy").then(function(enc) {
        if (!enc || !enc.result || !enc.result.data)
          throw new Error("enc-cinejoy returned no data");
        return timeout(fetch(API + "/g", { method: "POST", headers: SITE_HEADERS, body: fromBase64Url(enc.result.data) }), TIMEOUT_MS, "g").then(function(res) {
          if (!res.ok)
            throw new Error("g HTTP " + res.status);
          return res.arrayBuffer();
        }).then(function(buf) {
          return json(ENC_DEC + "/dec-cinejoy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: toBase64Url(new Uint8Array(buf)), state: enc.result.state })
          }, "dec-cinejoy");
        });
      }).then(function(dec) {
        var streams = dec && dec.result && dec.result.data && dec.result.data.stream || [];
        return streams.filter(function(s) {
          return s && s.playlist;
        }).map(function(s) {
          var subs = (s.captions || []).filter(function(c) {
            return c && c.url && /^en/i.test(String(c.id || c.language || "en"));
          }).map(function(c) {
            return { url: c.url, language: "en", name: "English", headers: SITE_HEADERS };
          });
          return { server, url: s.playlist, subtitles: subs };
        });
      }).catch(function() {
        return [];
      });
    }
    function getStreams2(tmdbId, mediaType, season, episode) {
      return tmdbInfo(tmdbId, mediaType).then(function(info) {
        if (!info.title)
          return [];
        var label = info.title + (info.year ? " (" + info.year + ")" : "") + (mediaType === "tv" ? " S" + String(season).padStart(2, "0") + "E" + String(episode).padStart(2, "0") : "");
        return listServers().then(function(servers) {
          return Promise.all(servers.map(function(name) {
            return fetchServer(info, tmdbId, mediaType, season, episode, name);
          }));
        }).then(function(lists) {
          var out = [];
          lists.forEach(function(list) {
            list.forEach(function(s) {
              out.push({
                name: "Cinejoy " + s.server,
                title: label,
                url: s.url,
                quality: "Auto",
                type: "hls",
                headers: SITE_HEADERS,
                subtitles: s.subtitles,
                provider: "cinejoy"
              });
            });
          });
          return out;
        });
      }).catch(function(err) {
        console.error("[Cinejoy] " + err.message);
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

// src/cinejoy/index.js
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
