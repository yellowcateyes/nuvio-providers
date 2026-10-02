/**
 * 4khdhub - Built from src/4khdhub/
 * Generated: 2026-10-02T21:12:25.561Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/4khdhub/core.js
var require_core = __commonJS({
  "src/4khdhub/core.js"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __defProps = Object.defineProperties;
    var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
    var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
    var __async = (__this, __arguments, generator) => {
      return new Promise((resolve, reject) => {
        var fulfilled = (value) => {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        };
        var rejected = (value) => {
          try {
            step(generator.throw(value));
          } catch (e) {
            reject(e);
          }
        };
        var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
        step((generator = generator.apply(__this, __arguments)).next());
      });
    };
    var BASE_URL = "https://4khdhub.click";
    var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
    var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
    var domainCache = { url: BASE_URL, ts: 0 };
    function fetchLatestDomain() {
      return __async(this, null, function* () {
        const now = Date.now();
        if (now - domainCache.ts < 36e5)
          return domainCache.url;
        try {
          const response = yield fetch(DOMAINS_URL);
          const data = yield response.json();
          if (data && data["4khdhub"]) {
            domainCache.url = data["4khdhub"];
            domainCache.ts = now;
          }
        } catch (e) {
        }
        return domainCache.url;
      });
    }
    function fetchText(_0) {
      return __async(this, arguments, function* (url, options = {}) {
        const retries = options.retries !== void 0 ? options.retries : 2;
        const delay = options.delay !== void 0 ? options.delay : 1e3;
        for (let i = 0; i <= retries; i++) {
          try {
            const response = yield fetch(url, {
              headers: __spreadValues({
                "User-Agent": USER_AGENT
              }, options.headers)
            });
            return yield response.text();
          } catch (err) {
            console.log(`[4KHDHub] Request failed for ${url}: ${err.message}${i < retries ? `, retrying (${i + 1}/${retries})...` : ""}`);
          }
          if (i < retries) {
            yield new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
          }
        }
        return null;
      });
    }
    function getTmdbDetails(tmdbId, type) {
      return __async(this, null, function* () {
        const isSeries = type === "series" || type === "tv";
        const endpoint = isSeries ? "tv" : "movie";
        const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        console.log(`[4KHDHub] Fetching TMDB details from: ${url}`);
        try {
          const response = yield fetch(url);
          const data = yield response.json();
          if (isSeries) {
            return {
              title: data.name,
              year: data.first_air_date ? parseInt(data.first_air_date.split("-")[0]) : 0
            };
          } else {
            return {
              title: data.title,
              year: data.release_date ? parseInt(data.release_date.split("-")[0]) : 0
            };
          }
        } catch (error) {
          console.log(`[4KHDHub] TMDB request failed: ${error.message}`);
          return null;
        }
      });
    }
    function atob(input) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      let str = String(input).replace(/=+$/, "");
      if (str.length % 4 === 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
      }
      let output = "";
      for (let bc = 0, bs, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        buffer = chars.indexOf(buffer);
      }
      return output;
    }
    function rot13Cipher(str) {
      return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
      });
    }
    function levenshteinDistance(s, t) {
      if (s === t)
        return 0;
      const n = s.length;
      const m = t.length;
      if (n === 0)
        return m;
      if (m === 0)
        return n;
      const d = [];
      for (let i = 0; i <= n; i++) {
        d[i] = [];
        d[i][0] = i;
      }
      for (let j = 0; j <= m; j++) {
        d[0][j] = j;
      }
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          const cost = s.charAt(i - 1) === t.charAt(j - 1) ? 0 : 1;
          d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        }
      }
      return d[n][m];
    }
    function parseBytes(val) {
      if (typeof val === "number")
        return val;
      if (!val)
        return 0;
      const match = val.match(/^([0-9.]+)\s*([a-zA-Z]+)$/);
      if (!match)
        return 0;
      const num = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      let multiplier = 1;
      if (unit.indexOf("k") === 0)
        multiplier = 1024;
      else if (unit.indexOf("m") === 0)
        multiplier = 1024 * 1024;
      else if (unit.indexOf("g") === 0)
        multiplier = 1024 * 1024 * 1024;
      else if (unit.indexOf("t") === 0)
        multiplier = 1024 * 1024 * 1024 * 1024;
      return num * multiplier;
    }
    function formatBytes(val) {
      if (val === 0)
        return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      let i = Math.floor(Math.log(val) / Math.log(k));
      if (i < 0)
        i = 0;
      return parseFloat((val / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }
    var cheerio = require("cheerio-without-node-native");
    function fetchPageUrl(name, year, isSeries) {
      return __async(this, null, function* () {
        const domain = yield fetchLatestDomain();
        const searchUrl = `${domain}/?s=${encodeURIComponent(name + " " + year)}`;
        console.log(`[4KHDHub] Search Request URL: ${searchUrl}`);
        const html = yield fetchText(searchUrl);
        if (!html) {
          console.log("[4KHDHub] Search failed: No HTML response");
          return null;
        }
        const $ = cheerio.load(html);
        const targetType = isSeries ? "Series" : "Movies";
        console.log(`[4KHDHub] Parsing search results for type: ${targetType}`);
        const matchingCards = $(".movie-card").filter((_, el) => {
          const hasFormat = $(el).find(`.movie-card-format:contains("${targetType}")`).length > 0;
          if (!hasFormat) {
          }
          return hasFormat;
        }).filter((_, el) => {
          const metaText = $(el).find(".movie-card-meta").text();
          const movieCardYear = parseInt(metaText);
          const yearMatch = !isNaN(movieCardYear) && Math.abs(movieCardYear - year) <= 1;
          if (!yearMatch) {
            console.log(`[4KHDHub] Skip: Year mismatch (${movieCardYear} vs ${year}) - ${$(el).find(".movie-card-title").text().trim()}`);
          }
          return yearMatch;
        }).filter((_, el) => {
          const movieCardTitle = $(el).find(".movie-card-title").text().replace(/\[.*?]/g, "").trim();
          const distance = levenshteinDistance(movieCardTitle.toLowerCase(), name.toLowerCase());
          const match = distance < 5;
          console.log(`[4KHDHub] Checking: "${movieCardTitle}" (Dist: ${distance}) vs "${name}"`);
          return match;
        }).map((_, el) => {
          let href = $(el).attr("href");
          if (href && !href.startsWith("http")) {
            href = domain + (href.startsWith("/") ? "" : "/") + href;
          }
          return href;
        }).get();
        if (matchingCards.length === 0) {
          console.log("[4KHDHub] No matching cards found after filtering");
        } else {
          console.log(`[4KHDHub] Found ${matchingCards.length} matching cards`);
        }
        return matchingCards.length > 0 ? matchingCards[0] : null;
      });
    }
    var cheerio2 = require("cheerio-without-node-native");
    function resolveRedirectUrl(redirectUrl) {
      return __async(this, null, function* () {
        if (redirectUrl.includes("hubcloud.") || redirectUrl.includes("hubdrive.")) {
          return redirectUrl;
        }
        const redirectHtml = yield fetchText(redirectUrl);
        if (!redirectHtml)
          return redirectUrl;
        try {
          const redirectDataMatch = redirectHtml.match(/'o','(.*?)'/);
          if (!redirectDataMatch)
            return redirectUrl;
          const step1 = atob(redirectDataMatch[1]);
          const step2 = atob(step1);
          const step3 = rot13Cipher(step2);
          const step4 = atob(step3);
          const redirectData = JSON.parse(step4);
          if (redirectData && redirectData.o) {
            return atob(redirectData.o);
          }
        } catch (e) {
          console.log(`[4KHDHub] Error resolving redirect: ${e.message}`);
        }
        return redirectUrl;
      });
    }
    function extractSourceResults($, el) {
      return __async(this, null, function* () {
        const localHtml = $(el).html();
        const sizeMatch = localHtml.match(/([\d.]+ ?[GM]B)/);
        const heightMatch = localHtml.match(/\d{3,}p/);
        const title = $(el).find(".file-title, .episode-file-title").text().trim();
        let height = heightMatch ? parseInt(heightMatch[0]) : 0;
        if (height === 0 && (title.includes("4K") || title.includes("4k") || localHtml.includes("4K") || localHtml.includes("4k"))) {
          height = 2160;
        }
        const meta = {
          bytes: sizeMatch ? parseBytes(sizeMatch[1]) : 0,
          height,
          title
        };
        const hubCloudLink = $(el).find("a").filter((_, a) => {
          const text = $(a).text();
          const href = $(a).attr("href") || "";
          return text.includes("HubCloud") || href.includes("hubcloud.") || href.includes("hubcloud/");
        }).attr("href");
        if (hubCloudLink) {
          const resolved = yield resolveRedirectUrl(hubCloudLink);
          return { url: resolved, meta };
        }
        const hubDriveLink = $(el).find("a").filter((_, a) => {
          const text = $(a).text();
          const href = $(a).attr("href") || "";
          return text.includes("HubDrive") || href.includes("hubdrive.") || href.includes("hubdrive/");
        }).attr("href");
        if (hubDriveLink) {
          const resolvedDrive = yield resolveRedirectUrl(hubDriveLink);
          if (resolvedDrive) {
            const hubDriveHtml = yield fetchText(resolvedDrive);
            if (hubDriveHtml) {
              const $2 = cheerio2.load(hubDriveHtml);
              const innerCloudLink = $2('a:contains("HubCloud")').attr("href") || $2("a").filter((_, a) => {
                const text = $2(a).text();
                const href = $2(a).attr("href") || "";
                return text.includes("HubCloud") || href.includes("hubcloud.") || href.includes("hubcloud/");
              }).attr("href");
              if (innerCloudLink) {
                return { url: innerCloudLink, meta };
              }
            }
          }
        }
        return null;
      });
    }
    function extractHubCloud(hubCloudUrl, baseMeta) {
      return __async(this, null, function* () {
        if (!hubCloudUrl)
          return [];
        const redirectHtml = yield fetchText(hubCloudUrl, { headers: { Referer: hubCloudUrl } });
        if (!redirectHtml)
          return [];
        const redirectUrlMatch = redirectHtml.match(/var url ?= ?'(.*?)'/);
        if (!redirectUrlMatch)
          return [];
        const finalLinksUrl = redirectUrlMatch[1];
        const linksHtml = yield fetchText(finalLinksUrl, { headers: { Referer: hubCloudUrl } });
        if (!linksHtml)
          return [];
        const $ = cheerio2.load(linksHtml);
        const results = [];
        const sizeText = $("#size").text();
        const titleText = $("title").text().trim();
        const currentMeta = __spreadProps(__spreadValues({}, baseMeta), {
          bytes: parseBytes(sizeText) || baseMeta.bytes,
          title: titleText || baseMeta.title
        });
        $("a").each((_, el) => {
          const text = $(el).text().trim();
          const href = $(el).attr("href");
          if (!href)
            return;
          if (text.includes("10Gbps") || text.includes("PixelServer") || href.includes("hubcloud.cx")) {
            results.push({
              source: "HubCloud 10Gbps",
              url: href,
              meta: currentMeta
            });
          } else if (text.includes("Download File") || href.includes("r2.dev")) {
            results.push({
              source: "Direct R2",
              url: href,
              meta: currentMeta
            });
          } else if (text.includes("ZipDisk") || href.includes("workers.dev")) {
            results.push({
              source: "ZipDisk Server",
              url: href,
              meta: currentMeta
            });
          } else if (text.includes("FSL")) {
            results.push({
              source: "FSL",
              url: href,
              meta: currentMeta
            });
          }
        });
        return results;
      });
    }
    var cheerio3 = require("cheerio-without-node-native");
    function getStreams2(tmdbId, type, season, episode) {
      return __async(this, null, function* () {
        const tmdbDetails = yield getTmdbDetails(tmdbId, type);
        if (!tmdbDetails)
          return [];
        const { title, year } = tmdbDetails;
        console.log(`[4KHDHub] Search: ${title} (${year})`);
        const isSeries = type === "series" || type === "tv";
        const pageUrl = yield fetchPageUrl(title, year, isSeries);
        if (!pageUrl) {
          console.log("[4KHDHub] Page not found");
          return [];
        }
        console.log(`[4KHDHub] Found page: ${pageUrl}`);
        const html = yield fetchText(pageUrl);
        if (!html)
          return [];
        const $ = cheerio3.load(html);
        const itemsToProcess = [];
        if (isSeries && season && episode) {
          const seasonStr = "S" + String(season).padStart(2, "0");
          const episodeStr = "Episode-" + String(episode).padStart(2, "0");
          $(".episode-item").each((_, el) => {
            if ($(".episode-title", el).text().includes(seasonStr)) {
              const downloadItems = $(".episode-download-item", el).filter((_2, item) => $(item).text().includes(episodeStr));
              downloadItems.each((_2, item) => {
                itemsToProcess.push(item);
              });
            }
          });
        } else {
          $(".download-item").each((_, el) => {
            itemsToProcess.push(el);
          });
        }
        console.log(`[4KHDHub] Processing ${itemsToProcess.length} items`);
        const streamPromises = itemsToProcess.map((item) => __async(this, null, function* () {
          try {
            const sourceResult = yield extractSourceResults($, item);
            if (sourceResult && sourceResult.url) {
              console.log(`[4KHDHub] Extracting from HubCloud: ${sourceResult.url}`);
              const extractedLinks = yield extractHubCloud(sourceResult.url, sourceResult.meta);
              return extractedLinks.map((link) => ({
                name: `4KHDHub - ${link.source}${sourceResult.meta.height ? ` ${sourceResult.meta.height}p` : ""}`,
                title: `${link.meta.title}
${formatBytes(link.meta.bytes || 0)}`,
                url: link.url,
                quality: sourceResult.meta.height ? `${sourceResult.meta.height}p` : void 0,
                behaviorHints: {
                  bingeGroup: `4khdhub-${link.source}`
                }
              }));
            }
            return [];
          } catch (err) {
            console.log(`[4KHDHub] Item processing error: ${err.message}`);
            return [];
          }
        }));
        const results = yield Promise.all(streamPromises);
        return results.reduce((acc, val) => acc.concat(val), []);
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
    module2.exports = { validateStreams: validateStreams2, dropWrongYear: dropWrongYear2 };
  }
});

// src/4khdhub/index.js
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
