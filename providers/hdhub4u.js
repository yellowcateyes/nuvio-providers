/**
 * hdhub4u - Built from src/hdhub4u/
 * Generated: 2026-10-02T21:00:18.048Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
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
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
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

// src/hdhub4u/constants.js
function updateMainUrl(url) {
  MAIN_URL = url;
  HEADERS.Referer = `${url}/`;
}
var TMDB_API_KEY, TMDB_BASE_URL, MAIN_URL, DOMAINS_URL, DOMAIN_CACHE_TTL, HEADERS;
var init_constants = __esm({
  "src/hdhub4u/constants.js"() {
    TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
    TMDB_BASE_URL = "https://api.themoviedb.org/3";
    MAIN_URL = "https://new6.hdhub4u.fo";
    DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
    DOMAIN_CACHE_TTL = 4 * 60 * 60 * 1e3;
    HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
      "Cookie": "xla=s4t",
      "Referer": `${MAIN_URL}/`
    };
  }
});

// src/hdhub4u/utils.js
function formatBytes(bytes) {
  if (!bytes || bytes === 0)
    return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
function extractServerName(source) {
  if (!source)
    return "Unknown";
  if (source.startsWith("HubCloud")) {
    const serverMatch = source.match(/HubCloud(?:\s*-\s*([^[\]]+))?/);
    return serverMatch ? serverMatch[1] || "Download" : "HubCloud";
  }
  if (source.startsWith("Pixeldrain"))
    return "Pixeldrain";
  if (source.startsWith("StreamTape"))
    return "StreamTape";
  if (source.startsWith("HubCdn"))
    return "HubCdn";
  if (source.startsWith("HbLinks"))
    return "HbLinks";
  if (source.startsWith("Hubstream"))
    return "Hubstream";
  return source.replace(/^www\./, "").split(".")[0];
}
function rot13(value) {
  return value.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  });
}
function atob(value) {
  if (!value)
    return "";
  let input = String(value).replace(/=+$/, "");
  let output = "";
  let bc = 0, bs, buffer, idx = 0;
  while (buffer = input.charAt(idx++)) {
    buffer = BASE64_CHARS.indexOf(buffer);
    if (~buffer) {
      bs = bc % 4 ? bs * 64 + buffer : buffer;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & bs >> (-2 * bc & 6));
      }
    }
  }
  return output;
}
function cleanTitle(title) {
  let name = title.replace(/\.[a-zA-Z0-9]{2,4}$/, "");
  const normalized = name.replace(/WEB[-_. ]?DL/gi, "WEB-DL").replace(/WEB[-_. ]?RIP/gi, "WEBRIP").replace(/H[ .]?265/gi, "H265").replace(/H[ .]?264/gi, "H264").replace(/DDP[ .]?([0-9]\.[0-9])/gi, "DDP$1");
  const parts = normalized.split(/[\s_.]/);
  const sourceTags = /* @__PURE__ */ new Set(["WEB-DL", "WEBRIP", "BLURAY", "HDRIP", "DVDRIP", "HDTV", "CAM", "TS", "BRRIP", "BDRIP"]);
  const codecTags = /* @__PURE__ */ new Set(["H264", "H265", "X264", "X265", "HEVC", "AVC"]);
  const audioTags = ["AAC", "AC3", "DTS", "MP3", "FLAC", "DD", "DDP", "EAC3"];
  const audioExtras = /* @__PURE__ */ new Set(["ATMOS"]);
  const hdrTags = /* @__PURE__ */ new Set(["SDR", "HDR", "HDR10", "HDR10+", "DV", "DOLBYVISION"]);
  const filtered = parts.map((part) => {
    const p = part.toUpperCase();
    if (sourceTags.has(p))
      return p;
    if (codecTags.has(p))
      return p;
    if (audioTags.some((tag) => p.startsWith(tag)))
      return p;
    if (audioExtras.has(p))
      return p;
    if (hdrTags.has(p))
      return p === "DOLBYVISION" || p === "DV" ? "DOLBYVISION" : p;
    if (p === "NF" || p === "CR")
      return p;
    return null;
  }).filter(Boolean);
  return [...new Set(filtered)].join(" ");
}
function fetchAndUpdateDomain() {
  return __async(this, null, function* () {
    const now = Date.now();
    if (now - domainCacheTimestamp < DOMAIN_CACHE_TTL)
      return;
    console.log("[HDHub4u] Fetching latest domain...");
    try {
      const response = yield fetch(DOMAINS_URL, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      if (response.ok) {
        const data = yield response.json();
        if (data && data.HDHUB4u) {
          const newDomain = data.HDHUB4u;
          if (newDomain !== MAIN_URL) {
            console.log(`[HDHub4u] Updating domain from ${MAIN_URL} to ${newDomain}`);
            updateMainUrl(newDomain);
            domainCacheTimestamp = now;
          }
        }
      }
    } catch (error) {
      console.error(`[HDHub4u] Failed to fetch latest domains: ${error.message}`);
    }
  });
}
function getCurrentDomain() {
  return __async(this, null, function* () {
    yield fetchAndUpdateDomain();
    return MAIN_URL;
  });
}
function normalizeTitle(title) {
  if (!title)
    return "";
  return title.toLowerCase().replace(/\b(the|a|an)\b/g, "").replace(/[:\-_]/g, " ").replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
}
function calculateTitleSimilarity(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  if (norm1 === norm2)
    return 1;
  const words1 = norm1.split(/\s+/).filter((w) => w.length > 0);
  const words2 = norm2.split(/\s+/).filter((w) => w.length > 0);
  if (words1.length === 0 || words2.length === 0)
    return 0;
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = words1.filter((w) => set2.has(w));
  const union = /* @__PURE__ */ new Set([...words1, ...words2]);
  const jaccard = intersection.length / union.size;
  const extraWordsCount = words2.filter((w) => !set1.has(w)).length;
  let score = jaccard - extraWordsCount * 0.05;
  if (words1.length > 0 && words1.every((w) => set2.has(w))) {
    score += 0.2;
  }
  return score;
}
function findBestTitleMatch(mediaInfo, searchResults, mediaType, season) {
  if (!searchResults || searchResults.length === 0)
    return null;
  let bestMatch = null;
  let bestScore = 0;
  for (const result of searchResults) {
    let score = calculateTitleSimilarity(mediaInfo.title, result.title);
    if (mediaInfo.year && result.year) {
      const yearDiff = Math.abs(mediaInfo.year - result.year);
      if (yearDiff === 0)
        score += 0.2;
      else if (yearDiff <= 1)
        score += 0.1;
      else if (yearDiff > 5)
        score -= 0.3;
    }
    if (mediaType === "tv" && season) {
      const titleLower = result.title.toLowerCase();
      const seasonPatterns = [
        `season ${season}`,
        `s${season}`,
        `season ${season.toString().padStart(2, "0")}`,
        `s${season.toString().padStart(2, "0")}`
      ];
      const hasSeason = seasonPatterns.some((p) => titleLower.includes(p));
      const otherSeasonMatch = titleLower.match(/season\s*(\d+)|s(\d+)/i);
      if (otherSeasonMatch) {
        const foundSeason = parseInt(otherSeasonMatch[1] || otherSeasonMatch[2]);
        if (foundSeason !== season) {
          score -= 0.8;
        }
      }
      if (hasSeason)
        score += 0.5;
      else
        score -= 0.3;
    }
    if (result.title.toLowerCase().includes("2160p") || result.title.toLowerCase().includes("4k")) {
      score += 0.05;
    }
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = result;
    }
  }
  if (bestMatch)
    console.log(`[HDHub4u] Best title match: "${bestMatch.title}" (score: ${bestScore.toFixed(2)})`);
  return bestMatch;
}
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const response = yield fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
    });
    if (!response.ok)
      throw new Error(`TMDB API error: ${response.status}`);
    const data = yield response.json();
    const title = mediaType === "tv" ? data.name : data.title;
    const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
    return { title, year, imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null };
  });
}
var domainCacheTimestamp, BASE64_CHARS;
var init_utils = __esm({
  "src/hdhub4u/utils.js"() {
    init_constants();
    domainCacheTimestamp = 0;
    BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  }
});

// src/hdhub4u/extractors.js
function getRedirectLinks(url) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(url, { headers: HEADERS });
      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const doc = yield response.text();
      const regex = /s\s*\(\s*['"]o['"]\s*,\s*['"]([A-Za-z0-9+/=]+)['"]|ck\s*\(\s*['"]_wp_http_\d+['"]\s*,\s*['"]([^'"]+)['"]/g;
      let combinedString = "";
      let match;
      while ((match = regex.exec(doc)) !== null) {
        const extractedValue = match[1] || match[2];
        if (extractedValue)
          combinedString += extractedValue;
      }
      if (!combinedString) {
        const redirectMatch = doc.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
        if (redirectMatch && redirectMatch[1]) {
          const newUrl = redirectMatch[1];
          if (newUrl !== url && !newUrl.includes(url)) {
            return yield getRedirectLinks(newUrl);
          }
        }
        return null;
      }
      const decodedString = atob(rot13(atob(atob(combinedString))));
      const jsonObject = JSON.parse(decodedString);
      const encodedUrl = atob(jsonObject.o || "").trim();
      if (encodedUrl)
        return encodedUrl;
      const data = atob(jsonObject.data || "").trim();
      const wpHttp = (jsonObject.blog_url || "").trim();
      if (wpHttp && data) {
        const directLinkResponse = yield fetch(`${wpHttp}?re=${data}`, { headers: HEADERS });
        const html = yield directLinkResponse.text();
        const $ = import_cheerio_without_node_native.default.load(html);
        return ($("body").text() || html).trim();
      }
      return null;
    } catch (e) {
      return null;
    }
  });
}
function vidStackExtractor(url) {
  return __async(this, null, function* () {
    var _a, _b, _c;
    try {
      const hash = url.split("#").pop().split("/").pop();
      const baseUrl = new URL(url).origin;
      const apiUrl = `${baseUrl}/api/v1/video?id=${hash}`;
      const response = yield fetch(apiUrl, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: url }) });
      const encoded = (yield response.text()).trim();
      const key = import_crypto_js.default.enc.Utf8.parse("kiemtienmua911ca");
      const ivs = ["1234567890oiuytr", "0123456789abcdef"];
      for (const ivStr of ivs) {
        try {
          const iv = import_crypto_js.default.enc.Utf8.parse(ivStr);
          const decrypted = import_crypto_js.default.AES.decrypt(
            { ciphertext: import_crypto_js.default.enc.Hex.parse(encoded) },
            key,
            { iv, mode: import_crypto_js.default.mode.CBC, padding: import_crypto_js.default.pad.Pkcs7 }
          );
          const decryptedText = decrypted.toString(import_crypto_js.default.enc.Utf8);
          if (decryptedText && decryptedText.includes("source")) {
            const m3u8 = (_b = (_a = decryptedText.match(/"source":"(.*?)"/)) == null ? void 0 : _a[1]) == null ? void 0 : _b.replace(/\\/g, "");
            const subtitles = [];
            const subtitleSection = (_c = decryptedText.match(/"subtitle":\{(.*?)\}/)) == null ? void 0 : _c[1];
            if (subtitleSection) {
              const subtitlePattern = /"([^"]+)":\s*"([^"]+)"/g;
              let subMatch;
              while ((subMatch = subtitlePattern.exec(subtitleSection)) !== null) {
                const lang = subMatch[1];
                const subPath = subMatch[2].split("#")[0].replace(/\\/g, "");
                if (subPath) {
                  subtitles.push({
                    language: lang,
                    url: subPath.startsWith("http") ? subPath : `${baseUrl}${subPath}`
                  });
                }
              }
            }
            if (m3u8) {
              return [{
                source: "Vidstack Hubstream",
                quality: "M3U8",
                url: m3u8.replace("https:", "http:"),
                headers: {
                  "Referer": url,
                  "Origin": url.split("/").pop()
                },
                subtitles
              }];
            }
          }
        } catch (e) {
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });
}
function hbLinksExtractor(url) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: url }) });
      const data = yield response.text();
      const $ = import_cheerio_without_node_native.default.load(data);
      const links = $("h3 a, h5 a, div.entry-content p a").map((i, el) => $(el).attr("href")).get();
      const results = yield Promise.all(links.map((l) => loadExtractor(l, url)));
      return results.flat().map((link) => __spreadProps(__spreadValues({}, link), {
        source: `${link.source} Hblinks`
      }));
    } catch (e) {
      return [];
    }
  });
}
function pixelDrainExtractor(link) {
  return __async(this, null, function* () {
    var _a;
    try {
      const urlObj = new URL(link);
      const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
      const fileId = ((_a = link.match(/(?:file|u)\/([A-Za-z0-9]+)/)) == null ? void 0 : _a[1]) || link.split("/").pop();
      if (!fileId)
        return [{ source: "Pixeldrain", quality: 0, url: link }];
      const finalUrl = link.includes("?download") ? link : `${baseUrl}/api/file/${fileId}?download`;
      return [{ source: "Pixeldrain", quality: 0, url: finalUrl }];
    } catch (e) {
      return [{ source: "Pixeldrain", quality: 0, url: link }];
    }
  });
}
function streamTapeExtractor(link) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    try {
      const url = new URL(link);
      url.hostname = "streamtape.com";
      const res = yield fetch(url.toString(), { headers: HEADERS });
      const data = yield res.text();
      let videoSrc = (_c = (_b = (_a = data.match(/document\.getElementById\('videolink'\)\.innerHTML = (.*?);/)) == null ? void 0 : _a[1]) == null ? void 0 : _b.match(/'(\/\/streamtape\.com\/get_video[^']+)'/)) == null ? void 0 : _c[1];
      if (!videoSrc) {
        videoSrc = (_d = data.match(/'(\/\/streamtape\.com\/get_video[^']+)'/)) == null ? void 0 : _d[1];
      }
      return videoSrc ? [{ source: "StreamTape", quality: 720, url: "https:" + videoSrc }] : [];
    } catch (e) {
      return [];
    }
  });
}
function hubCloudExtractor(url, referer) {
  return __async(this, null, function* () {
    var _a;
    try {
      let currentUrl = url.replace("hubcloud.ink", "hubcloud.dad");
      const pageResponse = yield fetch(currentUrl, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) });
      let pageData = yield pageResponse.text();
      let finalUrl = currentUrl;
      if (!currentUrl.includes("hubcloud.php")) {
        let nextHref = "";
        const $first = import_cheerio_without_node_native.default.load(pageData);
        const downloadBtn = $first("#download");
        if (downloadBtn.length) {
          nextHref = downloadBtn.attr("href");
        } else {
          const scriptUrlMatch = pageData.match(/var url = '([^']*)'/);
          if (scriptUrlMatch)
            nextHref = scriptUrlMatch[1];
        }
        if (nextHref) {
          if (!nextHref.startsWith("http")) {
            const urlObj = new URL(currentUrl);
            nextHref = `${urlObj.protocol}//${urlObj.hostname}/${nextHref.replace(/^\//, "")}`;
          }
          finalUrl = nextHref;
          const secondResponse = yield fetch(finalUrl, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: currentUrl }) });
          pageData = yield secondResponse.text();
        }
      }
      const $ = import_cheerio_without_node_native.default.load(pageData);
      const size = $("i#size").text().trim();
      const header = $("div.card-header").text().trim();
      const qualityStr = (_a = header.match(/(\d{3,4})[pP]/)) == null ? void 0 : _a[1];
      const quality = qualityStr ? parseInt(qualityStr) : 1080;
      const headerDetails = cleanTitle(header);
      const labelExtras = (headerDetails ? `[${headerDetails}]` : "") + (size ? `[${size}]` : "");
      const sizeInBytes = (() => {
        const sizeMatch = size.match(/([\d.]+)\s*(GB|MB|KB)/i);
        if (!sizeMatch)
          return 0;
        const multipliers = { GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024 };
        return parseFloat(sizeMatch[1]) * (multipliers[sizeMatch[2].toUpperCase()] || 0);
      })();
      const links = [];
      const elements = $("a.btn").get();
      for (const element of elements) {
        const link = $(element).attr("href");
        const text = $(element).text().toLowerCase();
        const fileName = header || headerDetails || "Unknown";
        if (text.includes("download file") || text.includes("fsl server") || text.includes("s3 server") || text.includes("fslv2") || text.includes("mega server") || link && link.includes("r2.dev")) {
          let label = "HubCloud";
          if (link && link.includes("r2.dev"))
            label = "Direct R2";
          else if (link && link.includes("workers.dev"))
            label = "ZipDisk Server";
          else if (text.includes("fsl server"))
            label = "HubCloud - FSL";
          else if (text.includes("s3 server"))
            label = "HubCloud - S3";
          else if (text.includes("fslv2"))
            label = "HubCloud - FSLv2";
          else if (text.includes("mega server"))
            label = "HubCloud - Mega";
          links.push({ source: `${label} ${labelExtras}`, quality, url: link, size: sizeInBytes, fileName });
        } else if (text.includes("buzzserver")) {
          try {
            const buzzResp = yield fetch(`${link}/download`, { method: "GET", headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: link }), redirect: "manual" });
            let dlink = buzzResp.headers.get("hx-redirect") || buzzResp.headers.get("HX-Redirect");
            if (!dlink && buzzResp.url && buzzResp.url !== `${link}/download`) {
              dlink = buzzResp.url;
            }
            if (dlink) {
              links.push({ source: `HubCloud - BuzzServer ${labelExtras}`, quality, url: dlink, size: sizeInBytes, fileName });
            }
          } catch (e) {
          }
        } else if (text.includes("10gbps") || link && link.includes("hubcloud.cx")) {
          let targetUrl = link;
          if (link && !link.includes("hubcloud.cx")) {
            try {
              const resp = yield fetch(link, { method: "GET", redirect: "manual" });
              const loc = resp.headers.get("location");
              if (loc && loc.includes("link=")) {
                targetUrl = loc.substring(loc.indexOf("link=") + 5);
              }
            } catch (e) {
            }
          }
          links.push({ source: `HubCloud - 10Gbps ${labelExtras}`, quality, url: targetUrl, size: sizeInBytes, fileName });
        } else if (text.includes("zipdisk") || link && link.includes("workers.dev")) {
          links.push({ source: `ZipDisk Server ${labelExtras}`, quality, url: link, size: sizeInBytes, fileName });
        } else if (link && link.includes("pixeldra")) {
          const results = yield pixelDrainExtractor(link);
          links.push(...results.map((l) => __spreadProps(__spreadValues({}, l), { source: `${l.source} ${labelExtras}`, size: sizeInBytes, fileName })));
        } else if (link && !link.includes("magnet:") && link.startsWith("http")) {
          const extracted = yield loadExtractor(link, finalUrl);
          links.push(...extracted.map((l) => __spreadProps(__spreadValues({}, l), { quality: l.quality || quality })));
        }
      }
      return links;
    } catch (e) {
      return [];
    }
  });
}
function hubCdnExtractor(url, referer) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) });
      const data = yield response.text();
      const $ = import_cheerio_without_node_native.default.load(data);
      let scriptContent = "";
      $("script").each((i, el) => {
        const html = $(el).html();
        if (html && html.includes("reurl")) {
          scriptContent = html;
        }
      });
      if (scriptContent) {
        const match = scriptContent.match(/reurl\s*=\s*["']([^"']+)["']/);
        if (match && match[1]) {
          const reurlVal = match[1];
          if (reurlVal.includes("?r=")) {
            const queryPart = reurlVal.split("?r=").pop();
            try {
              const decoded = atob(queryPart);
              const m3u8Link = decoded.substring(decoded.lastIndexOf("link=") + 5);
              if (m3u8Link && m3u8Link.startsWith("http")) {
                return [{ source: "HubCdn", quality: 1080, url: m3u8Link }];
              }
            } catch (e) {
            }
          } else if (reurlVal.includes("link=")) {
            const m3u8Link = reurlVal.split("link=").pop();
            if (m3u8Link && m3u8Link.startsWith("http")) {
              return [{ source: "HubCdn", quality: 1080, url: m3u8Link }];
            }
          } else if (reurlVal.startsWith("http")) {
            return [{ source: "HubCdn", quality: 1080, url: reurlVal }];
          }
        }
      }
      const encodedMatch = data.match(/r=([A-Za-z0-9+/=]+)/);
      if (encodedMatch && encodedMatch[1]) {
        try {
          const decoded = atob(encodedMatch[1]);
          const m3u8Link = decoded.substring(decoded.lastIndexOf("link=") + 5);
          if (m3u8Link && m3u8Link.startsWith("http")) {
            return [{ source: "HubCdn", quality: 1080, url: m3u8Link }];
          }
        } catch (e) {
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });
}
function loadExtractor(_0) {
  return __async(this, arguments, function* (url, referer = MAIN_URL) {
    try {
      const hostname = new URL(url).hostname;
      const isRedirect = url.includes("?id=") || hostname.includes("techyboy4u") || hostname.includes("gadgetsweb.xyz") || hostname.includes("cryptoinsights.site") || hostname.includes("bloggingvector") || hostname.includes("ampproject.org");
      if (isRedirect) {
        const finalLink = yield getRedirectLinks(url);
        if (finalLink && finalLink !== url)
          return yield loadExtractor(finalLink, url);
        return [];
      }
      if (hostname.includes("hubcloud"))
        return yield hubCloudExtractor(url, referer);
      if (hostname.includes("hubcdn"))
        return yield hubCdnExtractor(url, referer);
      if (hostname.includes("hblinks") || hostname.includes("hubstream.dad"))
        return yield hbLinksExtractor(url);
      if (hostname.includes("hubstream") || hostname.includes("vidstack"))
        return yield vidStackExtractor(url);
      if (hostname.includes("pixeldrain"))
        return yield pixelDrainExtractor(url);
      if (hostname.includes("streamtape"))
        return yield streamTapeExtractor(url);
      if (hostname.includes("hdstream4u"))
        return [{ source: "HdStream4u", quality: 1080, url }];
      if (hostname.includes("hubdrive")) {
        const res = yield fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) });
        const data = yield res.text();
        const href = import_cheerio_without_node_native.default.load(data)(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href");
        if (href)
          return yield loadExtractor(href, url);
      }
      return [];
    } catch (e) {
      return [];
    }
  });
}
var import_cheerio_without_node_native, import_crypto_js;
var init_extractors = __esm({
  "src/hdhub4u/extractors.js"() {
    import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
    import_crypto_js = __toESM(require("crypto-js"));
    init_constants();
    init_utils();
  }
});

// src/hdhub4u/core.js
var require_core = __commonJS({
  "src/hdhub4u/core.js"(exports2, module2) {
    var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));
    init_constants();
    init_utils();
    init_extractors();
    function search(query) {
      return __async(this, null, function* () {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const searchUrl = `https://search.hdhub4u.glass/collections/post/documents/search?q=${encodeURIComponent(query)}&query_by=post_title,category&query_by_weights=4,2&sort_by=sort_by_date:desc&limit=15&highlight_fields=none&use_cache=true&page=1&analytics_tag=${today}`;
        const response = yield fetch(searchUrl, { headers: HEADERS });
        const data = yield response.json();
        if (!data || !data.hits)
          return [];
        return data.hits.map((hit) => {
          const doc = hit.document;
          const title = doc.post_title;
          const yearMatch = title.match(/\((\d{4})\)|\b(\d{4})\b/);
          const year = yearMatch ? parseInt(yearMatch[1] || yearMatch[2]) : null;
          let url = doc.permalink;
          if (url && url.startsWith("/")) {
            url = `${MAIN_URL}${url}`;
          }
          return {
            title,
            url,
            poster: doc.post_thumbnail,
            year
          };
        });
      });
    }
    function getDownloadLinks(mediaUrl) {
      return __async(this, null, function* () {
        const domain = yield getCurrentDomain();
        if (mediaUrl.includes("hdhub4u.")) {
          try {
            const urlObj = new URL(mediaUrl);
            const domainObj = new URL(domain);
            urlObj.hostname = domainObj.hostname;
            mediaUrl = urlObj.toString();
          } catch (e) {
          }
        }
        const response = yield fetch(mediaUrl, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: `${domain}/` }) });
        const data = yield response.text();
        const $ = import_cheerio_without_node_native2.default.load(data);
        const typeRaw = $("h1.page-title span").text();
        const isMovie = typeRaw.toLowerCase().includes("movie");
        if (isMovie) {
          const qualityLinks = $("h3 a, h4 a").filter((i, el) => $(el).text().match(/480|720|1080|2160|4K/i));
          const bodyLinks = $(".page-body > div a").filter((i, el) => {
            const href = $(el).attr("href");
            return href && (href.includes("hdstream4u") || href.includes("hubstream"));
          });
          const initialLinks = [.../* @__PURE__ */ new Set([
            ...qualityLinks.map((i, el) => $(el).attr("href")).get(),
            ...bodyLinks.map((i, el) => $(el).attr("href")).get()
          ])];
          const results = yield Promise.all(initialLinks.map((url) => loadExtractor(url, mediaUrl)));
          const allFinalLinks = results.flat();
          const seenUrls = /* @__PURE__ */ new Set();
          const uniqueFinalLinks = allFinalLinks.filter((link) => {
            var _a;
            if (!link.url || link.url.includes(".zip") || ((_a = link.name) == null ? void 0 : _a.toLowerCase().includes(".zip")))
              return false;
            if (seenUrls.has(link.url))
              return false;
            seenUrls.add(link.url);
            return true;
          });
          return { finalLinks: uniqueFinalLinks, isMovie };
        } else {
          const episodeLinksMap = /* @__PURE__ */ new Map();
          const directLinkBlocks = [];
          $("h3, h4").each((i, element) => {
            const $el = $(element);
            const text = $el.text();
            const anchors = $el.find("a");
            const links = anchors.map((i2, a) => $(a).attr("href")).get();
            const isDirectLinkBlock = anchors.get().some((a) => $(a).text().match(/1080|720|4K|2160/i));
            if (isDirectLinkBlock) {
              directLinkBlocks.push(...links);
              return;
            }
            const episodeMatch = text.match(/(?:EPiSODE\s*(\d+)|E(\d+))/i);
            if (episodeMatch) {
              const epNum = parseInt(episodeMatch[1] || episodeMatch[2]);
              if (!episodeLinksMap.has(epNum))
                episodeLinksMap.set(epNum, []);
              episodeLinksMap.get(epNum).push(...links);
              let nextElement = $el.next();
              while (nextElement.length && nextElement.get(0).tagName !== "hr") {
                const siblingLinks = nextElement.find("a[href]").map((i2, a) => $(a).attr("href")).get();
                episodeLinksMap.get(epNum).push(...siblingLinks);
                nextElement = nextElement.next();
              }
            }
          });
          if (directLinkBlocks.length > 0) {
            yield Promise.all(directLinkBlocks.map((blockUrl) => __async(this, null, function* () {
              try {
                const resolvedUrl = yield getRedirectLinks(blockUrl);
                if (!resolvedUrl)
                  return;
                const blockRes = yield fetch(resolvedUrl, { headers: HEADERS });
                const blockData = yield blockRes.text();
                const $$ = import_cheerio_without_node_native2.default.load(blockData);
                $$("h5 a, h4 a, h3 a").each((i, el) => {
                  const linkText = $$(el).text();
                  const linkHref = $$(el).attr("href");
                  const epMatch = linkText.match(/Episode\s*(\d+)/i);
                  if (epMatch && linkHref) {
                    const epNum = parseInt(epMatch[1]);
                    if (!episodeLinksMap.has(epNum))
                      episodeLinksMap.set(epNum, []);
                    episodeLinksMap.get(epNum).push(linkHref);
                  }
                });
              } catch (e) {
              }
            })));
          }
          const initialLinks = [];
          episodeLinksMap.forEach((links, epNum) => {
            const uniqueLinks = [...new Set(links)];
            initialLinks.push(...uniqueLinks.map((link) => ({ url: link, episode: epNum })));
          });
          const results = yield Promise.all(initialLinks.map((linkInfo) => __async(this, null, function* () {
            try {
              const extracted = yield loadExtractor(linkInfo.url, mediaUrl);
              return extracted.map((ext) => __spreadProps(__spreadValues({}, ext), { episode: linkInfo.episode }));
            } catch (e) {
              return [];
            }
          })));
          const allFinalLinks = results.flat();
          const seenUrls = /* @__PURE__ */ new Set();
          const uniqueFinalLinks = allFinalLinks.filter((link) => {
            if (!link.url || link.url.includes(".zip"))
              return false;
            if (seenUrls.has(link.url))
              return false;
            seenUrls.add(link.url);
            return true;
          });
          return { finalLinks: uniqueFinalLinks, isMovie };
        }
      });
    }
    function getStreams2(tmdbId, mediaType = "movie", season = null, episode = null) {
      return __async(this, null, function* () {
        console.log(`[HDHub4u] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
        try {
          const mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
          console.log(`[HDHub4u] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || "N/A"})`);
          const searchQuery = mediaType === "tv" && season ? `${mediaInfo.title} Season ${season}` : mediaInfo.title;
          const searchResults = yield search(searchQuery);
          if (searchResults.length === 0)
            return [];
          const bestMatch = findBestTitleMatch(mediaInfo, searchResults, mediaType, season);
          const selectedMedia = bestMatch || searchResults[0];
          console.log(`[HDHub4u] Selected: "${selectedMedia.title}" (${selectedMedia.url})`);
          const result = yield getDownloadLinks(selectedMedia.url);
          const finalLinks = result.finalLinks;
          let filteredLinks = finalLinks;
          if (mediaType === "tv" && episode !== null) {
            filteredLinks = finalLinks.filter((link) => link.episode === episode);
          }
          const streams = filteredLinks.map((link) => {
            let mediaTitle = link.fileName && link.fileName !== "Unknown" ? link.fileName : mediaInfo.title;
            if (mediaType === "tv" && season && episode) {
              mediaTitle = `${mediaInfo.title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
            }
            const serverName = extractServerName(link.source);
            let qualityStr = "Unknown";
            if (typeof link.quality === "number" && link.quality > 0) {
              if (link.quality >= 2160)
                qualityStr = "4K";
              else if (link.quality >= 1080)
                qualityStr = "1080p";
              else if (link.quality >= 720)
                qualityStr = "720p";
              else if (link.quality >= 480)
                qualityStr = "480p";
            } else if (typeof link.quality === "string") {
              qualityStr = link.quality;
            }
            return {
              name: `HDHub4u ${serverName}`,
              title: mediaTitle,
              url: link.url,
              quality: qualityStr,
              size: formatBytes(link.size),
              headers: link.headers || void 0,
              provider: "hdhub4u"
            };
          });
          const qualityOrder = { "4K": 4, "1080p": 2, "720p": 1, "480p": 0, "Unknown": -2 };
          return streams.sort((a, b) => (qualityOrder[b.quality] || -3) - (qualityOrder[a.quality] || -3));
        } catch (error) {
          console.error(`[HDHub4u] Scraping error: ${error.message}`);
          return [];
        }
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

// src/hdhub4u/index.js
var { getStreams: scrape } = require_core();
var { validateStreams } = require_validate();
function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve(scrape(tmdbId, mediaType, season, episode)).then(function(streams) {
    return validateStreams(streams);
  });
}
module.exports = { getStreams };
