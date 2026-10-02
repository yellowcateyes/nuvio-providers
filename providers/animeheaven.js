/**
 * animeheaven - Built from src/animeheaven/
 * Generated: 2026-10-02T22:37:08.093Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/animeheaven/core.js
var require_core = __commonJS({
  "src/animeheaven/core.js"(exports2, module2) {
    var BASE = "https://animeheaven.me";
    var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
    var TMDB = "https://api.themoviedb.org/3";
    var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
    var TIMEOUT_MS = 12e3;
    function timeout(promise, ms, label2) {
      return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
          reject(new Error(label2 + " timed out"));
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
    function get(url, headers, label2) {
      return timeout(fetch(url, { headers: Object.assign({ "User-Agent": UA }, headers || {}) }), TIMEOUT_MS, label2 || "request").then(function(res) {
        if (!res.ok)
          throw new Error((label2 || "request") + " HTTP " + res.status);
        return res;
      });
    }
    function norm(s) {
      return String(s || "").toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9\s]/g, " ").replace(/\b(the|a|an)\b/g, " ").replace(/\s+/g, " ").trim();
    }
    function ordinal(n) {
      var s = ["th", "st", "nd", "rd"], v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
    function tmdbInfo(tmdbId, mediaType, season) {
      var kind = mediaType === "tv" ? "tv" : "movie";
      return get(TMDB + "/" + kind + "/" + tmdbId + "?api_key=" + TMDB_KEY + "&append_to_response=alternative_titles", null, "tmdb").then(function(r) {
        return r.json();
      }).then(function(d) {
        var names = [d.name || d.title, d.original_name || d.original_title];
        var alts = d.alternative_titles && (d.alternative_titles.results || d.alternative_titles.titles) || [];
        alts.slice(0, 12).forEach(function(a) {
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
        var seasons = d.seasons || [];
        var cur = seasons.filter(function(s) {
          return s.season_number === season;
        })[0];
        var before = seasons.filter(function(s) {
          return s.season_number > 0 && s.season_number < season;
        }).reduce(function(n, s) {
          return n + (s.episode_count || 0);
        }, 0);
        return {
          title: d.name || d.title,
          names,
          arcName: cur && cur.name && !/^season \d+$/i.test(cur.name) && cur.name || "",
          seasonEpisodes: cur ? cur.episode_count : 0,
          episodesBefore: before,
          year: String(d.first_air_date || d.release_date || "").slice(0, 4)
        };
      });
    }
    function search(query) {
      return get(BASE + "/search.php?s=" + encodeURIComponent(query), { Referer: BASE + "/" }, "search").then(function(r) {
        return r.text();
      }).then(function(html) {
        var out = [], re = /<a href='anime\.php\?([a-z0-9]+)' class='c'>([^<]+)<\/a>/g, m;
        while (m = re.exec(html))
          out.push({ id: m[1], name: m[2].replace(/&amp;/g, "&").replace(/&#0?39;/g, "'") });
        return out;
      }).catch(function() {
        return [];
      });
    }
    function openEntry(id) {
      return get(BASE + "/anime.php?" + id, { Referer: BASE + "/" }, "anime page").then(function(r) {
        return r.text();
      }).then(function(html) {
        var eps = {}, count = 0, re = /id ?= ?"([a-f0-9]{32})"[\s\S]*?watch2[^>]*>\s*(\d+)\s*</g, m;
        while (m = re.exec(html)) {
          eps[+m[2]] = m[1];
          count++;
        }
        return { id, episodes: eps, count };
      });
    }
    var MARKER_WORDS = /^(season|final|part|cour|ii|iii|iv|v|\d+(st|nd|rd|th)?)$/;
    function parseEntryName(name, baseNorms) {
      var n = norm(name);
      var base = baseNorms.filter(function(b) {
        return n === b || n.indexOf(b + " ") === 0;
      }).sort(function(x, y) {
        return y.length - x.length;
      })[0];
      if (!base)
        return null;
      var rest = n.slice(base.length).trim().split(" ").filter(Boolean);
      if (rest.some(function(w) {
        return !MARKER_WORDS.test(w);
      }))
        return null;
      var text = rest.join(" ");
      var seasonNum = 1;
      var m = text.match(/(\d+)(?:st|nd|rd|th)? season/) || text.match(/season (\d+)/);
      if (m)
        seasonNum = parseInt(m[1], 10);
      else if (/\bfinal\b/.test(text))
        seasonNum = 99;
      var part = 1;
      var pm = text.match(/part (ii|iii|iv|\d+)/);
      if (pm)
        part = { ii: 2, iii: 3, iv: 4 }[pm[1]] || parseInt(pm[1], 10);
      return { seasonNum, part };
    }
    function queriesFor(info, season) {
      var qs = [];
      info.names.slice(0, 4).forEach(function(n) {
        qs.push(n);
        if (season > 1) {
          qs.push(n + " " + ordinal(season) + " Season");
          qs.push(n + " Season " + season);
        }
      });
      if (info.arcName)
        qs.push(info.arcName);
      var seen = {};
      return qs.filter(function(q) {
        var k = norm(q);
        if (!k || seen[k])
          return false;
        seen[k] = true;
        return true;
      }).slice(0, 8);
    }
    function collect(info, season) {
      return Promise.all(queriesFor(info, season).map(search)).then(function(lists) {
        var byId = {}, out = [];
        lists.forEach(function(l) {
          l.forEach(function(it) {
            if (!byId[it.id]) {
              byId[it.id] = true;
              out.push(it);
            }
          });
        });
        return out;
      });
    }
    function openAll(items) {
      return Promise.all(items.map(function(it) {
        return openEntry(it.id).then(function(e) {
          e.name = it.name;
          e.rank = it.rank;
          return e;
        }).catch(function() {
          return null;
        });
      })).then(function(list) {
        return list.filter(Boolean);
      });
    }
    function locate(info, mediaType, season, episode) {
      var baseNorms = info.names.map(norm).filter(Boolean);
      return collect(info, season).then(function(items) {
        if (mediaType === "movie") {
          var movies = items.filter(function(it) {
            return baseNorms.indexOf(norm(it.name)) !== -1;
          }).slice(0, 2);
          return openAll(movies).then(function(es) {
            var one = es.filter(function(e) {
              return e.count === 1;
            })[0];
            return one ? { entry: one, number: 1 } : null;
          });
        }
        var want = info.seasonEpisodes;
        var arcNorm = info.arcName ? norm(info.arcName) : "";
        var arcMatches = arcNorm ? items.filter(function(it) {
          var n = norm(it.name);
          return n.indexOf(arcNorm) !== -1 && baseNorms.some(function(b) {
            return n.indexOf(b) === 0;
          });
        }).slice(0, 2) : [];
        var arcStep = arcMatches.length ? openAll(arcMatches).then(function(es) {
          var hit = es.filter(function(e) {
            return want && e.count === want;
          })[0];
          return hit ? { entry: hit, number: episode } : null;
        }) : Promise.resolve(null);
        return arcStep.then(function(hit) {
          if (hit)
            return hit;
          var chain = [];
          items.forEach(function(it) {
            var parsed = parseEntryName(it.name, baseNorms);
            if (parsed) {
              it.rank = parsed;
              chain.push(it);
            }
          });
          chain.sort(function(a, b) {
            return a.rank.seasonNum - b.rank.seasonNum || a.rank.part - b.rank.part;
          });
          if (!chain.length || chain[0].rank.seasonNum !== 1 || chain[0].rank.part !== 1)
            return null;
          return openAll(chain.slice(0, 8)).then(function(entries) {
            entries.sort(function(a, b) {
              return a.rank.seasonNum - b.rank.seasonNum || a.rank.part - b.rank.part;
            });
            var absolute = info.episodesBefore + episode;
            var seasonOnePlain = season === 1 && want && entries[0] && entries[0].count === want;
            if (seasonOnePlain)
              return { entry: entries[0], number: episode };
            if (entries[0] && entries[0].episodes[absolute])
              return { entry: entries[0], number: absolute };
            var passed = 0;
            for (var i = 0; i < entries.length; i++) {
              if (absolute <= passed + entries[i].count)
                return { entry: entries[i], number: absolute - passed };
              passed += entries[i].count;
            }
            return null;
          });
        });
      });
    }
    function sourcesFor(hash, entryId) {
      return get(BASE + "/gate.php", { Referer: BASE + "/anime.php?" + entryId, Cookie: "key=" + hash }, "gate").then(function(r) {
        return r.text();
      }).then(function(html) {
        var urls = [], seen = {}, re = /<source src='([^']+\.mp4[^']*)'/g, m;
        while (m = re.exec(html)) {
          var u = m[1];
          if (/[?&]error/.test(u) || seen[u])
            continue;
          seen[u] = true;
          urls.push(u);
        }
        return urls;
      });
    }
    function mp4Resolution(url, headers) {
      return timeout(fetch(url, { headers: Object.assign({ Range: "bytes=0-1048575" }, headers) }), 1e4, "mp4 header").then(function(res) {
        return res.arrayBuffer();
      }).then(function(buf) {
        var b = new Uint8Array(buf), best = 0, bestH = 0;
        for (var i = 4; i < b.length - 8; i++) {
          if (b[i] === 116 && b[i + 1] === 107 && b[i + 2] === 104 && b[i + 3] === 100) {
            var size = (b[i - 4] << 24 | b[i - 3] << 16 | b[i - 2] << 8 | b[i - 1]) >>> 0;
            if (size < 84 || size > 120 || i - 4 + size > b.length)
              continue;
            var end = i - 4 + size;
            var w = (b[end - 8] << 8 | b[end - 7]) >>> 0, h = (b[end - 4] << 8 | b[end - 3]) >>> 0;
            if (w * h > best) {
              best = w * h;
              bestH = h;
            }
          }
        }
        return bestH;
      }).catch(function() {
        return 0;
      });
    }
    function label(h) {
      if (!h)
        return "Unknown";
      if (h >= 2e3)
        return "2160p";
      if (h >= 1e3)
        return "1080p";
      if (h >= 700)
        return "720p";
      if (h >= 460)
        return "480p";
      return "360p";
    }
    function getStreams2(tmdbId, mediaType, season, episode) {
      var s = mediaType === "tv" ? season || 1 : 1;
      var e = mediaType === "tv" ? episode || 1 : 1;
      return tmdbInfo(tmdbId, mediaType, s).then(function(info) {
        return locate(info, mediaType, s, e).then(function(hit) {
          if (!hit)
            return [];
          var hash = hit.entry.episodes[hit.number];
          if (!hash)
            return [];
          return sourcesFor(hash, hit.entry.id).then(function(urls) {
            var headers = { "User-Agent": UA, "Referer": BASE + "/" };
            return Promise.all(urls.map(function(u, i) {
              return mp4Resolution(u, headers).then(function(h) {
                return {
                  name: "AnimeHeaven" + (urls.length > 1 ? " #" + (i + 1) : "") + " (Sub)",
                  title: hit.entry.name + (mediaType === "tv" ? " - Episode " + hit.number : ""),
                  url: u,
                  quality: label(h),
                  headers,
                  provider: "animeheaven"
                };
              });
            }));
          });
        });
      }).catch(function(err) {
        console.error("[AnimeHeaven] " + err.message);
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

// src/animeheaven/index.js
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
