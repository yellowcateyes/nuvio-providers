/**
 * anizone - Built from src/anizone/
 * Generated: 2026-10-02T22:39:51.927Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/anizone/core.js
var require_core = __commonJS({
  "src/anizone/core.js"(exports2, module2) {
    var BASE = "https://anizone.to";
    var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
    var TMDB = "https://api.themoviedb.org/3";
    var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
    var TIMEOUT_MS = 12e3;
    var HEADERS = { "User-Agent": UA, "Referer": BASE + "/", "Origin": BASE };
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
    function get(url, label) {
      return timeout(fetch(url, { headers: { "User-Agent": UA, "Referer": BASE + "/" } }), TIMEOUT_MS, label).then(function(res) {
        if (!res.ok)
          throw new Error(label + " HTTP " + res.status);
        return res.text();
      });
    }
    function norm(s) {
      return String(s || "").toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9\s]/g, " ").replace(/\b(the|a|an)\b/g, " ").replace(/\s+/g, " ").trim();
    }
    function embeddedJson(html, marker) {
      var re = new RegExp(marker + "JSON\\.parse\\('((?:[^'\\\\]|\\\\.)*)'\\)");
      var m = html.match(re);
      if (!m)
        return null;
      try {
        return JSON.parse(JSON.parse('"' + m[1].replace(/\\u0022/g, '\\"') + '"'));
      } catch (e) {
        return null;
      }
    }
    function tmdbInfo(tmdbId, mediaType) {
      var kind = mediaType === "tv" ? "tv" : "movie";
      return get(TMDB + "/" + kind + "/" + tmdbId + "?api_key=" + TMDB_KEY + "&append_to_response=alternative_titles", "tmdb").then(function(body) {
        var d = JSON.parse(body);
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
        var seasons = (d.seasons || []).filter(function(s) {
          return s.season_number > 0;
        });
        return {
          title: d.name || d.title,
          names,
          year: parseInt(String(d.first_air_date || d.release_date || "").slice(0, 4), 10) || 0,
          seasons: seasons.map(function(s) {
            return { number: s.season_number, name: s.name, episodes: s.episode_count || 0, year: parseInt(String(s.air_date || "").slice(0, 4), 10) || 0 };
          })
        };
      });
    }
    function searchEntries(query) {
      return get(BASE + "/anime?search=" + encodeURIComponent(query), "search").then(function(html) {
        var items = embeddedJson(html, "items: ");
        return Array.isArray(items) ? items : [];
      }).catch(function() {
        return [];
      });
    }
    function titlesOf(item) {
      var out = [item.main_title];
      var list = item.title_list || {};
      Object.keys(list).forEach(function(k) {
        out.push(list[k]);
      });
      return out.map(norm).filter(Boolean);
    }
    function matchesShow(item, baseNorms) {
      var titles = titlesOf(item);
      return titles.some(function(t) {
        return baseNorms.some(function(b) {
          return t === b || t.indexOf(b + " ") === 0;
        });
      });
    }
    function isRegularSeries(item) {
      var t = String(item.type || "");
      return !t || /(tv|series|web)/i.test(t) && !/(movie|ova|special|music)/i.test(t);
    }
    function locate(info, mediaType, season, episode, items) {
      var baseNorms = info.names.map(norm);
      if (mediaType === "movie") {
        var movies = items.filter(function(it) {
          return /movie/i.test(String(it.type || "")) && titlesOf(it).some(function(t) {
            return baseNorms.indexOf(t) !== -1;
          }) && (!info.year || !it.start_year || Math.abs(it.start_year - info.year) <= 1);
        });
        return movies.length ? { item: movies[0], number: 1 } : null;
      }
      var show = items.filter(function(it) {
        return isRegularSeries(it) && matchesShow(it, baseNorms) && it.episode_count;
      });
      var cur = info.seasons.filter(function(s) {
        return s.number === season;
      })[0];
      if (!cur)
        return null;
      var exact = show.filter(function(it) {
        return it.episode_count === cur.episodes && (!cur.year || !it.start_year || Math.abs(it.start_year - cur.year) <= 1);
      }).sort(function(a, b) {
        return Math.abs((a.start_year || 0) - cur.year) - Math.abs((b.start_year || 0) - cur.year);
      });
      if (exact.length === 1 || exact.length > 1 && exact[0].start_year !== exact[1].start_year) {
        return { item: exact[0], number: episode };
      }
      if (exact.length > 1) {
        var arc = norm(cur.name);
        var named = arc && !/^season \d+$/.test(arc) ? exact.filter(function(it) {
          return titlesOf(it).some(function(t) {
            return t.indexOf(arc.replace(/ arc$/, "")) !== -1;
          });
        }) : [];
        return named.length === 1 ? { item: named[0], number: episode } : null;
      }
      var chain = show.slice().sort(function(a, b) {
        return (a.start_year || 0) - (b.start_year || 0) || a.main_title.localeCompare(b.main_title);
      });
      var total = info.seasons.reduce(function(n, s) {
        return n + s.episodes;
      }, 0);
      var chainTotal = chain.reduce(function(n, it) {
        return n + it.episode_count;
      }, 0);
      if (!chain.length || Math.abs(chainTotal - total) > 2)
        return null;
      var absolute = info.seasons.filter(function(s) {
        return s.number < season;
      }).reduce(function(n, s) {
        return n + s.episodes;
      }, 0) + episode;
      var passed = 0;
      for (var i = 0; i < chain.length; i++) {
        if (absolute <= passed + chain[i].episode_count)
          return { item: chain[i], number: absolute - passed };
        passed += chain[i].episode_count;
      }
      return null;
    }
    function episodeStream(item, number) {
      return get(BASE + "/anime/" + item.slug + "/" + number, "episode page").then(function(html) {
        var player = embeddedJson(html, "vidstackPlayer\\(");
        if (!player || !player.src)
          return null;
        var subtitles = (player.subtitles || []).filter(function(s) {
          return s.file;
        }).map(function(s) {
          return { url: s.file, language: s.language || "en", name: s.title || "English", headers: HEADERS };
        });
        return { src: player.src, subtitles };
      });
    }
    function getStreams2(tmdbId, mediaType, season, episode) {
      var s = mediaType === "tv" ? season || 1 : 1;
      var e = mediaType === "tv" ? episode || 1 : 1;
      return tmdbInfo(tmdbId, mediaType).then(function(info) {
        var queries = info.names.slice(0, 3);
        return Promise.all(queries.map(searchEntries)).then(function(lists) {
          var seen = {}, items = [];
          lists.forEach(function(l) {
            l.forEach(function(it) {
              if (!seen[it.slug]) {
                seen[it.slug] = true;
                items.push(it);
              }
            });
          });
          var hit = locate(info, mediaType, s, e, items);
          if (!hit)
            return [];
          return episodeStream(hit.item, hit.number).then(function(ep) {
            if (!ep)
              return [];
            return [{
              name: "AniZone",
              title: hit.item.main_title + (mediaType === "tv" ? " - Episode " + hit.number : ""),
              url: ep.src,
              quality: "Auto",
              type: "hls",
              headers: HEADERS,
              subtitles: ep.subtitles,
              provider: "anizone"
            }];
          });
        });
      }).catch(function(err) {
        console.error("[AniZone] " + err.message);
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

// src/anizone/index.js
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
