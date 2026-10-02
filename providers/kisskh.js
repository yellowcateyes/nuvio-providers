/**
 * kisskh - Built from src/kisskh/
 * Generated: 2026-10-02T22:47:29.510Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/kisskh/core.js
var require_core = __commonJS({
  "src/kisskh/core.js"(exports2, module2) {
    var DOMAINS = ["https://kisskh.do", "https://kisskh.co", "https://kisskh.id"];
    var ENC_DEC = "https://enc-dec.app/api";
    var TMDB = "https://api.themoviedb.org/3";
    var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
    var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
    var TIMEOUT_MS = 12e3;
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
    function norm(s) {
      return String(s || "").toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9\s]/g, " ").replace(/\b(the|a|an)\b/g, " ").replace(/\s+/g, " ").trim();
    }
    function getJson(url, headers, label) {
      return timeout(fetch(url, { headers }), TIMEOUT_MS, label).then(function(res) {
        if (!res.ok)
          throw new Error(label + " HTTP " + res.status);
        return res.text();
      }).then(function(text) {
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error(label + " did not return JSON");
        }
      });
    }
    function siteHeaders(base) {
      return { "User-Agent": UA, "Accept": "application/json, text/plain, */*", "Referer": base + "/", "Origin": base };
    }
    function withDomain(fn) {
      var lastError = new Error("no KissKH domain reachable");
      return DOMAINS.reduce(function(chain, base) {
        return chain.catch(function() {
          return fn(base).then(function(result) {
            return { base, result };
          });
        }, null);
      }, Promise.reject(lastError));
    }
    function tmdbInfo(tmdbId, mediaType) {
      var kind = mediaType === "tv" ? "tv" : "movie";
      return getJson(TMDB + "/" + kind + "/" + tmdbId + "?api_key=" + TMDB_KEY + "&append_to_response=alternative_titles", { "User-Agent": UA }, "tmdb").then(function(d) {
        var names = [d.name || d.title, d.original_name || d.original_title];
        var alts = d.alternative_titles && (d.alternative_titles.results || d.alternative_titles.titles) || [];
        alts.slice(0, 15).forEach(function(a) {
          names.push(a.title);
        });
        var seen = {};
        names = names.filter(function(n) {
          n = norm(n);
          if (!n || seen[n])
            return false;
          seen[n] = true;
          return true;
        });
        return {
          title: d.name || d.title,
          names,
          year: parseInt(String(d.first_air_date || d.release_date || "").slice(0, 4), 10) || 0,
          seasons: (d.seasons || []).filter(function(s) {
            return s.season_number > 0;
          })
        };
      });
    }
    function search(base, query) {
      return getJson(base + "/api/DramaList/Search?q=" + encodeURIComponent(query) + "&type=0", siteHeaders(base), "search").then(function(list) {
        return Array.isArray(list) ? list : [];
      });
    }
    function releaseYear(drama) {
      var m = String(drama.releaseDate || drama.ReleaseDate || "").match(/(19|20)\d{2}/);
      if (m)
        return parseInt(m[0], 10);
      var t = String(drama.title || "").match(/\((\d{4})\)/);
      return t ? parseInt(t[1], 10) : 0;
    }
    function titleFitsSeason(siteTitle, baseNorms, season) {
      var n = norm(siteTitle).replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
      var base = baseNorms.filter(function(b) {
        return n === b || n.indexOf(b + " ") === 0;
      }).sort(function(x, y) {
        return y.length - x.length;
      })[0];
      if (!base)
        return false;
      var rest = n.slice(base.length).trim();
      if (season === 1)
        return rest === "" || rest === "season 1" || rest === "1";
      return rest === "season " + season || rest === String(season) || rest === season + "nd season" || rest === season + "rd season" || rest === season + "th season";
    }
    function pickDrama(base, info, mediaType, season, episode) {
      var baseNorms = info.names.map(norm);
      var queries = info.names.slice(0, 3);
      return Promise.all(queries.map(function(q) {
        return search(base, q).catch(function() {
          return [];
        });
      })).then(function(lists) {
        var seen = {}, cands = [];
        lists.forEach(function(l) {
          l.forEach(function(it) {
            if (it && it.id && !seen[it.id]) {
              seen[it.id] = true;
              cands.push(it);
            }
          });
        });
        var fits = cands.filter(function(it) {
          return mediaType === "movie" ? baseNorms.indexOf(norm(it.title)) !== -1 : titleFitsSeason(it.title, baseNorms, season);
        }).slice(0, 4);
        return Promise.all(fits.map(function(it) {
          return getJson(base + "/api/DramaList/Drama/" + it.id + "?isq=false", siteHeaders(base), "drama").catch(function() {
            return null;
          });
        }));
      }).then(function(dramas) {
        var good = dramas.filter(function(d) {
          if (!d || !Array.isArray(d.episodes))
            return false;
          var y = releaseYear(d);
          var cur = info.seasons.filter(function(x) {
            return x.season_number === season;
          })[0];
          var expected = mediaType === "tv" && cur && parseInt(String(cur.air_date || "").slice(0, 4), 10) || info.year;
          return !expected || !y || Math.abs(y - expected) <= 1;
        });
        for (var i = 0; i < good.length; i++) {
          var eps = good[i].episodes;
          var want = mediaType === "movie" ? 1 : episode;
          var ep = eps.filter(function(e) {
            return Number(e.number) === want;
          })[0];
          if (!ep && mediaType === "movie" && eps.length === 1)
            ep = eps[0];
          if (ep && ep.id)
            return { drama: good[i], episodeId: ep.id };
        }
        return null;
      });
    }
    function kkey(episodeId, type) {
      return getJson(ENC_DEC + "/enc-kisskh?text=" + encodeURIComponent(episodeId) + "&type=" + type, { "User-Agent": UA }, "enc-kisskh").then(function(j) {
        if (!j || !j.result)
          throw new Error("enc-kisskh returned no key");
        return j.result;
      });
    }
    function plainSubtitle(src) {
      return /\.(srt|vtt|ass|ssa)(\?|$)/i.test(src);
    }
    function getStreams2(tmdbId, mediaType, season, episode) {
      var s = mediaType === "tv" ? season || 1 : 1;
      var e = mediaType === "tv" ? episode || 1 : 1;
      return tmdbInfo(tmdbId, mediaType).then(function(info) {
        return withDomain(function(base) {
          return pickDrama(base, info, mediaType, s, e).then(function(hit) {
            if (!hit)
              throw new Error("drama not found on " + base);
            return Promise.all([kkey(hit.episodeId, "vid"), kkey(hit.episodeId, "sub")]).then(function(keys) {
              var headers = siteHeaders(base);
              return Promise.all([
                getJson(base + "/api/DramaList/Episode/" + hit.episodeId + ".png?err=false&ts=&time=&kkey=" + keys[0], headers, "episode"),
                getJson(base + "/api/Sub/" + hit.episodeId + "?kkey=" + keys[1], headers, "subtitles").catch(function() {
                  return [];
                })
              ]).then(function(res) {
                return { base, drama: hit.drama, source: res[0], subs: res[1] };
              });
            });
          });
        }).then(function(out) {
          var r = out.result;
          var url = r.source && (r.source.Video || r.source.video);
          if (!url)
            return [];
          var headers = { "User-Agent": UA, "Referer": r.base + "/", "Origin": r.base };
          var subtitles = (Array.isArray(r.subs) ? r.subs : []).filter(function(x) {
            return x && x.src && plainSubtitle(x.src);
          }).map(function(x) {
            return { url: x.src, language: x.land || x.language || "en", name: x.label || x.language || "Subtitles", headers };
          });
          return [{
            name: "KissKH",
            title: (r.drama.title || info.title) + (mediaType === "tv" ? " - Episode " + e : ""),
            url,
            quality: "Auto",
            type: /\.m3u8/i.test(url) ? "hls" : void 0,
            headers,
            subtitles,
            provider: "kisskh"
          }];
        });
      }).catch(function(err) {
        console.error("[KissKH] " + err.message);
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
    function dropWrongYear(streams, tmdbId, mediaType) {
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
    function dropIndianLanguages(streams) {
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
    module2.exports = { validateStreams: validateStreams2, dropWrongYear, dropIndianLanguages };
  }
});

// src/kisskh/index.js
var { getStreams: scrape } = require_core();
var { validateStreams } = require_validate();
function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve(scrape(tmdbId, mediaType, season, episode)).then(function(streams) {
    return validateStreams(streams);
  });
}
module.exports = { getStreams };
