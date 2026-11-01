/**
 * megaplay - Built from src/megaplay/
 * Generated: 2026-11-01T09:34:47.627Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/megaplay/core.js
var require_core = __commonJS({
  "src/megaplay/core.js"(exports2, module2) {
    var MEGAPLAY = "https://megaplay.buzz";
    var ANILIST = "https://graphql.anilist.co";
    var DECRYPT = "https://enc-dec.app/api/dec-megaplay";
    var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
    var TMDB = "https://api.themoviedb.org/3";
    var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
    var TIMEOUT_MS = 12e3;
    var DAY = 864e5;
    var SLACK_DAYS = 3;
    var MP_HEADERS = { "User-Agent": UA, "Origin": MEGAPLAY, "Referer": MEGAPLAY + "/", "X-Requested-With": "XMLHttpRequest" };
    var PLAY_HEADERS = { "User-Agent": UA, "Origin": MEGAPLAY, "Referer": MEGAPLAY + "/" };
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
    function request(url, options, label) {
      return timeout(fetch(url, options), TIMEOUT_MS, label).then(function(res) {
        if (!res.ok)
          throw new Error(label + " HTTP " + res.status);
        return res.text();
      });
    }
    function norm(s) {
      return String(s || "").toLowerCase().replace(/&amp;/g, "&").replace(/[×✕]/g, "x").replace(/[^a-z0-9぀-ヿ一-鿿]+/g, "");
    }
    function toTime(d) {
      if (!d || !d.year)
        return null;
      return Date.UTC(d.year, (d.month || 1) - 1, d.day || 1);
    }
    function parseDate(s) {
      var m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
    }
    function tmdbInfo(tmdbId, mediaType) {
      var kind = mediaType === "tv" ? "tv" : "movie";
      return request(TMDB + "/" + kind + "/" + tmdbId + "?api_key=" + TMDB_KEY + "&append_to_response=alternative_titles", {}, "tmdb").then(function(body) {
        var d = JSON.parse(body);
        var names = [d.name || d.title, d.original_name || d.original_title];
        var alts = d.alternative_titles && (d.alternative_titles.results || d.alternative_titles.titles) || [];
        alts.slice(0, 10).forEach(function(a) {
          names.push(a.title);
        });
        var seen = {};
        names = names.filter(function(n) {
          var k = norm(n);
          if (!k || seen[k])
            return false;
          seen[k] = true;
          return true;
        });
        var info = {
          names,
          year: parseInt(String(d.first_air_date || d.release_date || "").slice(0, 4), 10) || 0,
          seasons: (d.seasons || []).filter(function(s) {
            return s.season_number > 0;
          })
        };
        if (mediaType !== "tv")
          return info;
        return Promise.all(info.seasons.map(function(s) {
          return request(TMDB + "/tv/" + tmdbId + "/season/" + s.season_number + "?api_key=" + TMDB_KEY, {}, "tmdb season").then(function(b) {
            return JSON.parse(b).episodes || [];
          });
        })).then(function(lists) {
          info.episodes = [];
          lists.forEach(function(eps, i) {
            eps.forEach(function(e) {
              info.episodes.push({ season: info.seasons[i].season_number, number: e.episode_number, date: parseDate(e.air_date) });
            });
          });
          return info;
        });
      });
    }
    var ANILIST_QUERY = "query($q:String){Page(perPage:25){media(search:$q,type:ANIME,sort:SEARCH_MATCH){idMal format episodes startDate{year month day} endDate{year month day} title{romaji english native} synonyms}}}";
    function searchAniList(query) {
      return request(ANILIST, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ query: ANILIST_QUERY, variables: { q: query } })
      }, "anilist").then(function(body) {
        var page = (JSON.parse(body).data || {}).Page || {};
        return (page.media || []).filter(function(m) {
          return m.idMal;
        });
      }).catch(function() {
        return [];
      });
    }
    function titlesOf(m) {
      var t = m.title || {};
      return [t.romaji, t.english, t.native].concat(m.synonyms || []).map(norm).filter(Boolean);
    }
    function matchesShow(m, baseNorms) {
      return titlesOf(m).some(function(t) {
        return baseNorms.some(function(b) {
          return b.length >= 4 && (t.indexOf(b) === 0 || b.length >= 8 && t.indexOf(b) !== -1);
        });
      });
    }
    function labelOf(m) {
      return m.title.english || m.title.romaji;
    }
    function locateMovie(info, entries) {
      var baseNorms = info.names.map(norm);
      var hits = entries.filter(function(m) {
        if (m.format !== "MOVIE" || !m.startDate || !m.startDate.year)
          return false;
        if (info.year && Math.abs(m.startDate.year - info.year) > 1)
          return false;
        return titlesOf(m).some(function(t) {
          return baseNorms.indexOf(t) !== -1;
        });
      });
      hits.sort(function(a, b) {
        return Math.abs(a.startDate.year - info.year) - Math.abs(b.startDate.year - info.year);
      });
      return hits.length ? { mal: hits[0].idMal, number: 1, label: labelOf(hits[0]), alts: [] } : null;
    }
    function locateEpisode(info, season, episode, entries) {
      var baseNorms = info.names.map(norm);
      var list = info.episodes || [];
      var idx = -1;
      for (var i = 0; i < list.length; i++)
        if (list[i].season === season && list[i].number === episode) {
          idx = i;
          break;
        }
      if (idx < 0 || !list[idx].date)
        return null;
      var date = list[idx].date;
      var runs = entries.filter(function(m) {
        return /^(TV|TV_SHORT|ONA)$/.test(m.format || "") && matchesShow(m, baseNorms) && toTime(m.startDate);
      });
      var covering = runs.filter(function(m) {
        var start2 = toTime(m.startDate), end = toTime(m.endDate) || start2 + (m.episodes || 13) * 7 * DAY + 30 * DAY;
        return date >= start2 - SLACK_DAYS * DAY && date <= end + SLACK_DAYS * DAY;
      });
      if (!covering.length)
        return null;
      if (covering.length > 1) {
        covering.sort(function(a, b) {
          return toTime(b.startDate) - toTime(a.startDate);
        });
        if (toTime(covering[0].startDate) === toTime(covering[1].startDate))
          return null;
      }
      var entry = covering[0];
      var start = toTime(entry.startDate), first = -1;
      for (var j = 0; j < list.length; j++) {
        if (list[j].date && list[j].date >= start - SLACK_DAYS * DAY) {
          first = j;
          break;
        }
      }
      if (first < 0 || first > idx)
        return null;
      var number = idx - first + 1;
      if (entry.episodes && number > entry.episodes)
        return null;
      var hit = { mal: entry.idMal, number, label: labelOf(entry), alts: [] };
      var parent = partParent(entry, runs);
      if (parent && parent.episodes)
        hit.alts.push({ mal: parent.idMal, number: number + parent.episodes, label: labelOf(parent) });
      return hit;
    }
    function stemOf(raw) {
      return String(raw || "").replace(/[\s:,-]*(\b(part|cour)\s*\d+|\b\d+(st|nd|rd|th)\s*(part|cour)|\b(second|2nd)\s*(part|cour))/gi, "").trim();
    }
    function partParent(entry, runs) {
      var stems = [entry.title.english, entry.title.romaji].filter(function(t) {
        return t && stemOf(t) !== t.trim();
      }).map(function(t) {
        return norm(stemOf(t));
      });
      if (!stems.length)
        return null;
      var start = toTime(entry.startDate);
      var parents = runs.filter(function(r) {
        var end = toTime(r.endDate);
        return r !== entry && end && end <= start && start - end < 200 * DAY && [r.title.english, r.title.romaji].some(function(t) {
          return stems.indexOf(norm(t)) !== -1;
        });
      });
      return parents.length === 1 ? parents[0] : null;
    }
    function decrypt(enc) {
      return request(DECRYPT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA },
        body: JSON.stringify({ text: enc })
      }, "decrypt").then(function(body) {
        var j = JSON.parse(body);
        return j && j.status === 200 && j.result ? j.result : null;
      });
    }
    function voiceStream(mal, number, voice) {
      return request(MEGAPLAY + "/stream/mal/" + mal + "/" + number + "/" + voice, { headers: MP_HEADERS }, "player page").then(function(html) {
        var m = html.match(/<title>File (\d+) - MegaPlay<\/title>/);
        if (!m)
          return null;
        return request(MEGAPLAY + "/stream/getSources?id=" + m[1] + "&platform=OTHER", { headers: MP_HEADERS }, "sources").then(function(body) {
          var src = JSON.parse(body);
          if (!src.enc)
            return null;
          return decrypt(src.enc).then(function(res) {
            var file = res && (res.file || res.sources && res.sources.file);
            if (!file)
              return null;
            var subtitles = (src.tracks || []).filter(function(t) {
              return t.file && /captions|subtitles/.test(t.kind || "");
            }).map(function(t) {
              return { url: t.file, language: String(t.label || "English").toLowerCase().slice(0, 2), name: t.label || "English", headers: PLAY_HEADERS };
            });
            return { url: file, subtitles };
          });
        });
      }).catch(function() {
        return null;
      });
    }
    function resolveVoices(hit) {
      var tries = [{ mal: hit.mal, number: hit.number, label: hit.label }].concat(hit.alts || []);
      function next(i) {
        if (i >= tries.length)
          return Promise.resolve([null, null, hit]);
        return Promise.all([voiceStream(tries[i].mal, tries[i].number, "sub"), voiceStream(tries[i].mal, tries[i].number, "dub")]).then(function(r) {
          return r[0] || r[1] ? r.concat([tries[i]]) : next(i + 1);
        });
      }
      return next(0);
    }
    function getStreams2(tmdbId, mediaType, season, episode) {
      var isTv = mediaType === "tv";
      var s = isTv ? season || 1 : 1;
      var e = isTv ? episode || 1 : 1;
      return tmdbInfo(tmdbId, mediaType).then(function(info) {
        return Promise.all(info.names.slice(0, 3).map(searchAniList)).then(function(lists) {
          var seen = {}, entries = [];
          lists.forEach(function(l) {
            l.forEach(function(m) {
              if (!seen[m.idMal]) {
                seen[m.idMal] = true;
                entries.push(m);
              }
            });
          });
          var hit = isTv ? locateEpisode(info, s, e, entries) : locateMovie(info, entries);
          if (!hit)
            return [];
          return resolveVoices(hit).then(function(r) {
            var used = r[2] || hit, out = [];
            ["Sub", "Dub"].forEach(function(label, i) {
              if (!r[i])
                return;
              out.push({
                name: "MegaPlay " + label,
                title: used.label + (isTv ? " - Episode " + used.number : "") + " (" + label + ")",
                url: r[i].url,
                quality: "Auto",
                type: "hls",
                headers: PLAY_HEADERS,
                subtitles: r[i].subtitles,
                provider: "megaplay"
              });
            });
            return out;
          });
        });
      }).catch(function(err) {
        console.error("[MegaPlay] " + err.message);
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
            if (/^image\//i.test(r.headers.get("content-type") || "")) {
              return r.arrayBuffer().then(function(buf) {
                var b = new Uint8Array(buf);
                if (b.length > 4 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71)
                  throw new Error("segment is a PNG image");
                return { height: maxWidth ? qualityFromWidth(maxWidth) : null };
              });
            }
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
    function dropIndianLanguages(streams) {
      if (!Array.isArray(streams))
        return streams;
      return streams.filter(function(st) {
        var parts = [st.name, st.title, st.language, st.lang];
        try {
          String(st.url || "").split("?")[0].split("#")[0].split("/").slice(3).forEach(function(seg) {
            if (!/^[A-Za-z0-9_-]{24,}$/.test(seg))
              parts.push(decodeURIComponent(seg));
          });
        } catch (e) {
        }
        return !INDIAN_LANG.test(parts.map(function(v) {
          return String(v || "");
        }).join(" "));
      });
    }
    module2.exports = { validateStreams: validateStreams2, dropWrongYear: dropWrongYear2, dropIndianLanguages };
  }
});

// src/megaplay/index.js
var { getStreams: scrape } = require_core();
var { validateStreams, dropWrongYear } = require_validate();
function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve(scrape(tmdbId, mediaType, season, episode)).then(function(streams) {
    return dropWrongYear(streams, tmdbId, mediaType);
  }).then(function(streams) {
    return validateStreams(streams);
  });
}
module.exports = { getStreams };
