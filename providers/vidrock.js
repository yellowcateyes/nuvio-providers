/**
 * vidrock - Built from src/vidrock/
 * Generated: 2026-10-02T21:00:18.039Z
 */
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/vidrock/core.js
var require_core = __commonJS({
  "src/vidrock/core.js"(exports2, module2) {
    var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
    var TMDB_BASE_URL = "https://api.themoviedb.org/3";
    var VIDROCK_BASE_URL = "https://vidrock.net";
    var CryptoJS = require("crypto-js");
    var SOURCE_KEY_HEX = "7f3e9c2a8b5d1f4e6a9c3b7d2e5f8a1c4b6d9e2f5a8c1b4d7e9f2a5c8b1d4e7f";
    function decryptSourceUrl(encrypted) {
      let b64 = String(encrypted).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4)
        b64 += "=";
      const hex = CryptoJS.enc.Hex.stringify(CryptoJS.enc.Base64.parse(b64));
      if (hex.length < 56)
        throw new Error("Ciphertext too short");
      const iv = hex.slice(0, 24) + "00000002";
      const ct = hex.slice(24, hex.length - 32);
      const plain = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Hex.parse(ct) },
        CryptoJS.enc.Hex.parse(SOURCE_KEY_HEX),
        { iv: CryptoJS.enc.Hex.parse(iv), mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding }
      );
      return plain.toString(CryptoJS.enc.Utf8);
    }
    var USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36";
    var WORKING_HEADERS = {
      "User-Agent": USER_AGENT,
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Referer": "https://vidrock.net/",
      "Origin": "https://vidrock.net",
      "DNT": "1"
    };
    var PLAYBACK_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
      "Referer": "https://vidrock.net/",
      "Origin": "https://vidrock.net"
    };
    function makeRequest(url, options = {}) {
      const defaultHeaders = __spreadValues({}, WORKING_HEADERS);
      return fetch(url, __spreadValues({
        method: options.method || "GET",
        headers: __spreadValues(__spreadValues({}, defaultHeaders), options.headers)
      }, options)).then(function(response) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      }).catch(function(error) {
        console.error(`[Vidrock] Request failed for ${url}: ${error.message}`);
        throw error;
      });
    }
    function getTMDBDetails(tmdbId, mediaType) {
      const endpoint = mediaType === "tv" ? "tv" : "movie";
      const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      return makeRequest(url).then(function(response) {
        return response.json();
      }).then(function(data) {
        var _a;
        const title = mediaType === "tv" ? data.name : data.title;
        const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
        const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
        return {
          title,
          year,
          imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null
        };
      });
    }
    function extractQuality(url) {
      if (!url)
        return "Unknown";
      const qualityPatterns = [
        /(\d{3,4})p/i,
        // 1080p, 720p, etc.
        /(\d{3,4})k/i,
        // 1080k, 720k, etc.
        /quality[_-]?(\d{3,4})/i,
        // quality-1080, quality_720, etc.
        /res[_-]?(\d{3,4})/i,
        // res-1080, res_720, etc.
        /(\d{3,4})x\d{3,4}/i
        // 1920x1080, 1280x720, etc.
      ];
      for (const pattern of qualityPatterns) {
        const match = url.match(pattern);
        if (match) {
          const qualityNum = parseInt(match[1]);
          if (qualityNum >= 240 && qualityNum <= 4320) {
            return `${qualityNum}p`;
          }
        }
      }
      if (url.includes("1080") || url.includes("1920"))
        return "1080p";
      if (url.includes("720") || url.includes("1280"))
        return "720p";
      if (url.includes("480") || url.includes("854"))
        return "480p";
      if (url.includes("360") || url.includes("640"))
        return "360p";
      if (url.includes("240") || url.includes("426"))
        return "240p";
      return "Unknown";
    }
    function needsHeaders(serverName, url) {
      return true;
      if (serverName === "Astra") {
        return true;
      }
      if (serverName === "Atlas" && url.includes("hls1.vdrk.site")) {
        return true;
      }
      if (serverName === "Luna" && url.includes("cdn.niggaflix.xyz")) {
        return true;
      }
      if (url.includes("cdn.vidrock.store") || url.includes("proxy.vidrock.store")) {
        return true;
      }
      return false;
    }
    function parseAstraPlaylist(playlistUrl, serverName, mediaInfo, seasonNum, episodeNum) {
      console.log(`[Vidrock] Fetching Astra playlist: ${playlistUrl}`);
      return fetch(playlistUrl, {
        method: "GET",
        headers: PLAYBACK_HEADERS
      }).then((response) => response.json()).then((data) => {
        const streams = [];
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item.url && item.resolution) {
              const quality = `${item.resolution}p`;
              let mediaTitle = mediaInfo.title || "Unknown";
              if (mediaInfo.year) {
                mediaTitle += ` (${mediaInfo.year})`;
              }
              if (seasonNum && episodeNum) {
                mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
              }
              const streamHeaders = PLAYBACK_HEADERS;
              streams.push({
                name: `Vidrock ${serverName} - ${quality}`,
                title: mediaTitle,
                url: item.url,
                quality,
                size: "Unknown",
                headers: streamHeaders,
                provider: "vidrock"
              });
              console.log(`[Vidrock] Added ${quality} stream from ${serverName}: ${item.url}`);
            }
          });
        }
        return streams;
      }).catch((error) => {
        console.error(`[Vidrock] Error parsing Astra playlist: ${error.message}`);
        return [];
      });
    }
    function processVidrockResponse(data, mediaInfo, seasonNum, episodeNum) {
      const streams = [];
      const astraPromises = [];
      try {
        console.log(`[Vidrock] Processing response:`, JSON.stringify(data, null, 2));
        if (!data || typeof data !== "object") {
          console.log(`[Vidrock] No valid response data found`);
          return Promise.resolve(streams);
        }
        Object.keys(data).forEach((serverName) => {
          const source = data[serverName];
          if (!source || !source.url) {
            console.log(`[Vidrock] ${serverName}: No URL found`);
            return;
          }
          let videoUrl;
          try {
            videoUrl = decryptSourceUrl(source.url);
          } catch (e) {
            console.log(`[Vidrock] ${serverName}: could not decrypt URL (${e.message})`);
            return;
          }
          if (!/^https?:\/\//.test(videoUrl)) {
            console.log(`[Vidrock] ${serverName}: decrypted value is not a URL`);
            return;
          }
          if (serverName === "Astra" && videoUrl.includes("cdn.vidrock.store/playlist/")) {
            console.log(`[Vidrock] Detected Astra server, will parse JSON playlist`);
            astraPromises.push(parseAstraPlaylist(videoUrl, serverName, mediaInfo, seasonNum, episodeNum));
            return;
          }
          let quality = extractQuality(videoUrl);
          let languageInfo = "";
          if (source.language) {
            languageInfo = ` [${source.language}]`;
          }
          let streamType = "Unknown";
          if (source.type === "hls" || videoUrl.includes(".m3u8")) {
            streamType = "HLS";
            if (quality === "Unknown") {
              quality = "Adaptive";
            }
          } else if (videoUrl.includes(".mp4")) {
            streamType = "MP4";
          } else if (videoUrl.includes(".mkv")) {
            streamType = "MKV";
          }
          let mediaTitle = mediaInfo.title || "Unknown";
          if (mediaInfo.year) {
            mediaTitle += ` (${mediaInfo.year})`;
          }
          if (seasonNum && episodeNum) {
            mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
          }
          const streamHeaders = needsHeaders(serverName, videoUrl) ? PLAYBACK_HEADERS : void 0;
          streams.push({
            name: `Vidrock ${serverName}${languageInfo} - ${quality}`,
            title: mediaTitle,
            url: videoUrl,
            quality,
            size: "Unknown",
            headers: streamHeaders,
            provider: "vidrock"
          });
          console.log(`[Vidrock] Added ${quality}${languageInfo} stream from ${serverName}: ${videoUrl}`);
        });
        if (astraPromises.length > 0) {
          return Promise.all(astraPromises).then((astraResults) => {
            astraResults.forEach((astraStreams) => {
              streams.push(...astraStreams);
            });
            return streams;
          });
        }
        return Promise.resolve(streams);
      } catch (error) {
        console.error(`[Vidrock] Error processing response: ${error.message}`);
        return Promise.resolve(streams);
      }
    }
    function fetchFromVidrock(mediaType, tmdbId, mediaInfo, seasonNum, episodeNum) {
      console.log(`[Vidrock] Fetching streams for ${mediaType} ID: ${tmdbId}...`);
      let itemId;
      if (mediaType === "tv" && seasonNum && episodeNum) {
        itemId = `${tmdbId}/${seasonNum}/${episodeNum}`;
      } else {
        itemId = tmdbId.toString();
      }
      const apiUrl = `${VIDROCK_BASE_URL}/api/${mediaType}/${itemId}`;
      console.log(`[Vidrock] API URL: ${apiUrl}`);
      return makeRequest(apiUrl).then(function(response) {
        return response.text();
      }).then(function(responseText) {
        console.log(`[Vidrock] Response length: ${responseText.length} characters`);
        try {
          const data = JSON.parse(responseText);
          return processVidrockResponse(data, mediaInfo, seasonNum, episodeNum);
        } catch (parseError) {
          console.error(`[Vidrock] Invalid JSON response: ${parseError.message}`);
          return Promise.resolve([]);
        }
      }).catch(function(error) {
        console.error(`[Vidrock] Error fetching streams: ${error.message}`);
        return [];
      });
    }
    function getStreams2(tmdbId, mediaType, seasonNum, episodeNum) {
      console.log(`[Vidrock] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === "tv" ? `, S:${seasonNum}E:${episodeNum}` : ""}`);
      return new Promise((resolve, reject) => {
        getTMDBDetails(tmdbId, mediaType).then(function(mediaInfo) {
          console.log(`[Vidrock] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || "N/A"})`);
          return fetchFromVidrock(mediaType, tmdbId, mediaInfo, seasonNum, episodeNum);
        }).then(function(streams) {
          const uniqueStreams = [];
          const seenUrls = /* @__PURE__ */ new Set();
          streams.forEach((stream) => {
            if (!seenUrls.has(stream.url)) {
              seenUrls.add(stream.url);
              uniqueStreams.push(stream);
            }
          });
          console.log(`[Vidrock] Total streams found: ${uniqueStreams.length}`);
          const getQualityValue = (quality) => {
            const q = quality.toLowerCase().replace(/p$/, "");
            if (q === "4k" || q === "2160")
              return 2160;
            if (q === "1440")
              return 1440;
            if (q === "1080")
              return 1080;
            if (q === "720")
              return 720;
            if (q === "480")
              return 480;
            if (q === "360")
              return 360;
            if (q === "240")
              return 240;
            if (q === "unknown")
              return 0;
            const numQuality = parseInt(q);
            if (!isNaN(numQuality) && numQuality > 0) {
              return numQuality;
            }
            return 1;
          };
          uniqueStreams.sort((a, b) => {
            const qualityA = getQualityValue(a.quality);
            const qualityB = getQualityValue(b.quality);
            return qualityB - qualityA;
          });
          resolve(uniqueStreams);
        }).catch(function(error) {
          console.error(`[Vidrock] Error fetching media details: ${error.message}`);
          resolve([]);
        });
      });
    }
    if (typeof module2 !== "undefined" && module2.exports) {
      module2.exports = { getStreams: getStreams2 };
    } else {
      global.getStreams = getStreams2;
    }
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
        if (seen[s.url])
          return false;
        seen[s.url] = true;
        return true;
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
    module2.exports = { validateStreams: validateStreams2 };
  }
});

// src/vidrock/index.js
var { getStreams: scrape } = require_core();
var { validateStreams } = require_validate();
function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve(scrape(tmdbId, mediaType, season, episode)).then(function(streams) {
    return validateStreams(streams);
  });
}
module.exports = { getStreams };
