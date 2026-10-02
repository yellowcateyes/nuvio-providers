/**
 * dvdplay - Built from src/dvdplay/
 * Generated: 2026-10-02T21:00:18.030Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/dvdplay/core.js
var require_core = __commonJS({
  "src/dvdplay/core.js"(exports2, module2) {
    var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
    var BASE_URL = "https://dvdplay.cv";
    global.URL_VALIDATION_ENABLED = true;
    function normalizeTitle(title) {
      return (title || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    }
    function calculateSimilarity(str1, str2) {
      var s1 = normalizeTitle(str1);
      var s2 = normalizeTitle(str2);
      if (s1 === s2)
        return 1;
      var len1 = s1.length;
      var len2 = s2.length;
      if (len1 === 0)
        return len2 === 0 ? 1 : 0;
      if (len2 === 0)
        return 0;
      var matrix = Array(len1 + 1).fill(null).map(function() {
        return Array(len2 + 1).fill(0);
      });
      for (var i = 0; i <= len1; i++)
        matrix[i][0] = i;
      for (var j = 0; j <= len2; j++)
        matrix[0][j] = j;
      for (i = 1; i <= len1; i++) {
        for (j = 1; j <= len2; j++) {
          var cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
      }
      var maxLen = Math.max(len1, len2);
      return (maxLen - matrix[len1][len2]) / maxLen;
    }
    function makeRequest(url, options = {}) {
      return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const fetchOptions = {
          method: options.method || "GET",
          headers: __spreadValues({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }, options.headers),
          timeout: 3e4
        };
        fetch(url, fetchOptions).then((response) => {
          if (options.allowRedirects === false && (response.status === 301 || response.status === 302 || response.status === 303 || response.status === 307 || response.status === 308)) {
            resolve({ statusCode: response.status, headers: Object.fromEntries(response.headers) });
            return;
          }
          return response.text().then((data) => {
            if (options.parseHTML && data) {
              const cheerio = require("cheerio-without-node-native");
              const $ = cheerio.load(data);
              resolve({ $, body: data, statusCode: response.status, headers: Object.fromEntries(response.headers) });
            } else {
              resolve({ body: data, statusCode: response.status, headers: Object.fromEntries(response.headers) });
            }
          });
        }).catch(reject);
      });
    }
    function getIndexQuality(str) {
      const match = (str || "").match(/(\d{3,4})[pP]/);
      return match ? parseInt(match[1]) : null;
    }
    function decodeFilename(filename) {
      if (!filename)
        return filename;
      try {
        let decoded = filename;
        if (decoded.startsWith("UTF-8")) {
          decoded = decoded.substring(5);
        }
        decoded = decodeURIComponent(decoded);
        return decoded;
      } catch (error) {
        return filename;
      }
    }
    function cleanTitle(title) {
      const decodedTitle = decodeFilename(title);
      const parts = decodedTitle.split(/[.\-_]/);
      const qualityTags = ["WEBRip", "WEB-DL", "WEB", "BluRay", "HDRip", "DVDRip", "HDTV", "CAM", "TS", "R5", "DVDScr", "BRRip", "BDRip", "DVD", "PDTV", "HD"];
      const audioTags = ["AAC", "AC3", "DTS", "MP3", "FLAC", "DD5", "EAC3", "Atmos"];
      const subTags = ["ESub", "ESubs", "Subs", "MultiSub", "NoSub", "EnglishSub", "HindiSub"];
      const codecTags = ["x264", "x265", "H264", "HEVC", "AVC"];
      const startIndex = parts.findIndex(
        (part) => qualityTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase()))
      );
      const endIndex = parts.map((part, index) => {
        const hasTag = [...subTags, ...audioTags, ...codecTags].some(
          (tag) => part.toLowerCase().includes(tag.toLowerCase())
        );
        return hasTag ? index : -1;
      }).filter((index) => index !== -1).pop() || -1;
      if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
        return parts.slice(startIndex, endIndex + 1).join(".");
      } else if (startIndex !== -1) {
        return parts.slice(startIndex).join(".");
      } else {
        return parts.slice(-3).join(".");
      }
    }
    function getFilenameFromUrl(url) {
      return new Promise((resolve) => {
        try {
          fetch(url, { method: "HEAD", timeout: 1e4 }).then((response) => {
            const contentDisposition = response.headers.get("content-disposition");
            let filename = null;
            if (contentDisposition) {
              const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
              if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/["']/g, "");
              }
            }
            if (!filename) {
              const urlObj = new URL(url);
              const pathParts = urlObj.pathname.split("/");
              filename = pathParts[pathParts.length - 1];
              if (filename && filename.includes(".")) {
                filename = filename.replace(/\.[^.]+$/, "");
              }
            }
            const decodedFilename = decodeFilename(filename);
            resolve(decodedFilename || null);
          }).catch(() => resolve(null));
        } catch (error) {
          resolve(null);
        }
      });
    }
    function extractHubCloudLinks(url, referer = "HubCloud") {
      var origin;
      try {
        origin = new URL(url).origin;
      } catch (e) {
        origin = "";
      }
      function toAbsolute(href, base) {
        try {
          return new URL(href, base).href;
        } catch (e) {
          return href;
        }
      }
      return makeRequest(url, { parseHTML: true }).then((response) => {
        const $ = response.$;
        var href;
        if (url.indexOf("hubcloud.php") !== -1) {
          href = url;
        } else {
          var tokenMatch = url.match(/\/video\/([^\/\?]+)(\?token=([^&\s]+))?/);
          if (tokenMatch) {
            var videoId = tokenMatch[1];
            var token = tokenMatch[3];
            if (token) {
              href = origin + "/video/" + videoId + "?token=" + token;
            } else {
              var tokenFromPage = $.html().match(/token=([^"'\s&]+)/);
              if (tokenFromPage) {
                href = origin + "/video/" + videoId + "?token=" + tokenFromPage[1];
              } else {
                href = url;
              }
            }
          } else {
            var rawHref = $("#download").attr("href") || $('a[href*="hubcloud.php"]').attr("href") || $(".download-btn").attr("href") || $('a[href*="download"]').attr("href");
            if (!rawHref)
              throw new Error("Download element not found");
            href = toAbsolute(rawHref, origin);
          }
        }
        return makeRequest(href, { parseHTML: true }).then(function(secondResponse) {
          return { firstResponse: response, secondResponse, href };
        });
      }).then((response) => {
        const $$ = response.secondResponse.$;
        const href = response.href;
        function resolveHubCloudUrl(url2) {
          console.log(`[DVDPlay] Resolving HubCloud URL: ${url2.substring(0, 50)}...`);
          if (url2.includes("r2.cloudflarestorage.com")) {
            console.log(`[DVDPlay] URL already resolved (R2): ${url2.substring(0, 50)}...`);
            return Promise.resolve(url2);
          }
          if (url2.includes("360news4u.net/dl.php?link=")) {
            console.log(`[DVDPlay] \u{1F50D} Processing 360news4u.net URL: ${url2.substring(0, 100)}...`);
            const linkMatch = url2.match(/360news4u\.net\/dl\.php\?link=([^&\s]+)/);
            console.log(`[DVDPlay] \u{1F50D} Regex match result:`, linkMatch);
            if (linkMatch && linkMatch[1]) {
              const actualUrl = decodeURIComponent(linkMatch[1]);
              console.log(`[DVDPlay] \u2705 Extracted Google Drive URL from 360news4u.net: ${actualUrl.substring(0, 80)}...`);
              return Promise.resolve(actualUrl);
            } else {
              console.log(`[DVDPlay] \u274C Failed to extract URL from 360news4u.net link`);
              console.log(`[DVDPlay] \u274C Full URL for debugging: ${url2}`);
            }
          }
          if (url2.includes("gamerxyt.com/dl.php?link=")) {
            console.log(`[DVDPlay] \u{1F50D} Processing gamerxyt.com URL: ${url2.substring(0, 100)}...`);
            const linkMatch = url2.match(/gamerxyt\.com\/dl\.php\?link=([^&\s]+)/);
            console.log(`[DVDPlay] \u{1F50D} Regex match result:`, linkMatch);
            if (linkMatch && linkMatch[1]) {
              const actualUrl = decodeURIComponent(linkMatch[1]);
              console.log(`[DVDPlay] \u2705 Extracted Google Drive URL from gamerxyt.com: ${actualUrl.substring(0, 80)}...`);
              return Promise.resolve(actualUrl);
            } else {
              console.log(`[DVDPlay] \u274C Failed to extract URL from gamerxyt.com link`);
              console.log(`[DVDPlay] \u274C Full URL for debugging: ${url2}`);
            }
          }
          if (url2.includes("video-downloads.googleusercontent.com")) {
            console.log(`[DVDPlay] Google Drive download URL found: ${url2.substring(0, 50)}...`);
            return Promise.resolve(url2);
          }
          return fetch(url2, {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            redirect: "manual"
            // Don't follow redirects automatically
          }).then((response2) => {
            var _a;
            if (response2.status >= 300 && response2.status < 400) {
              const location = response2.headers.get("location");
              if (location) {
                console.log(`[DVDPlay] Following redirect to: ${location.substring(0, 50)}...`);
                return resolveHubCloudUrl(location);
              }
            }
            if (response2.status === 200 && ((_a = response2.headers.get("content-type")) == null ? void 0 : _a.includes("video/"))) {
              console.log(`[DVDPlay] Direct file URL found: ${url2.substring(0, 50)}...`);
              return url2;
            }
            if (response2.status === 200) {
              console.log(`[DVDPlay] Checking for direct URL in response...`);
              return response2.text().then((text) => {
                const directUrlMatch = text.match(/(https?:\/\/[^"'\s]+\.r2\.cloudflarestorage\.com[^"'\s]*)/);
                if (directUrlMatch) {
                  console.log(`[DVDPlay] Found direct URL in response: ${directUrlMatch[1].substring(0, 50)}...`);
                  return directUrlMatch[1];
                }
                const otherDirectMatch = text.match(/(https?:\/\/[^"'\s]+\/[^"'\s]*\.(mkv|mp4|avi|m4v)[^"'\s]*)/i);
                if (otherDirectMatch) {
                  console.log(`[DVDPlay] Found direct file URL: ${otherDirectMatch[1].substring(0, 50)}...`);
                  return otherDirectMatch[1];
                }
                console.log(`[DVDPlay] No direct URL found, returning original`);
                return url2;
              });
            }
            console.log(`[DVDPlay] Could not resolve URL, returning original`);
            return url2;
          }).catch((error) => {
            console.log(`[DVDPlay] Error resolving URL: ${error.message}`);
            return url2;
          });
        }
        function buildTask(buttonText, buttonLink, headerDetails, size, quality) {
          const qualityLabel = quality ? " - " + quality + "p" : " - Unknown";
          const pd = buttonLink.match(/pixeldrain\.(?:net|dev)\/u\/([a-zA-Z0-9]+)/);
          if (pd && pd[1])
            buttonLink = "https://pixeldrain.net/api/file/" + pd[1];
          if (buttonLink.includes(".fans/?id=") || buttonLink.includes(".workers.dev/?id=") || buttonLink.includes("360news4u.net/dl.php")) {
            return resolveHubCloudUrl(buttonLink).then((resolvedUrl) => {
              if (resolvedUrl.includes(".workers.dev/?id=") && !resolvedUrl.includes("r2.cloudflarestorage.com") && !resolvedUrl.includes("video-downloads.googleusercontent.com") && !resolvedUrl.includes("360news4u.net/dl.php")) {
                console.log(`[DVDPlay] Second attempt to resolve: ${resolvedUrl.substring(0, 50)}...`);
                return resolveHubCloudUrl(resolvedUrl);
              }
              return resolvedUrl;
            }).then((resolvedUrl) => {
              return getFilenameFromUrl(resolvedUrl).then((actualFilename) => {
                const displayFilename = actualFilename || headerDetails || "Unknown";
                let finalQuality = quality;
                if (!finalQuality) {
                  finalQuality = getIndexQuality(displayFilename);
                }
                if (!finalQuality && headerDetails) {
                  finalQuality = getIndexQuality(headerDetails);
                }
                const finalQualityLabel = finalQuality ? " - " + finalQuality + "p" : " - Unknown";
                const titleParts = [];
                if (displayFilename)
                  titleParts.push(displayFilename);
                if (size)
                  titleParts.push(size);
                const finalTitle = titleParts.join("\n");
                let name;
                if (buttonText.includes("FSL Server"))
                  name = "DVDPlay - FSL Server" + finalQualityLabel;
                else if (buttonText.includes("S3 Server"))
                  name = "DVDPlay - S3 Server" + finalQualityLabel;
                else if (/pixeldra/i.test(buttonText) || /pixeldra/i.test(buttonLink))
                  name = "DVDPlay - Pixeldrain" + finalQualityLabel;
                else if (buttonText.includes("Download File"))
                  name = "DVDPlay - HubCloud" + finalQualityLabel;
                else
                  name = "DVDPlay - HubCloud" + finalQualityLabel;
                return {
                  name,
                  title: finalTitle,
                  url: resolvedUrl,
                  quality: finalQuality ? finalQuality + "p" : "Unknown",
                  size: size || null,
                  fileName: actualFilename || null,
                  type: "direct"
                };
              }).catch(() => {
                const displayFilename = headerDetails || "Unknown";
                const titleParts = [];
                if (displayFilename)
                  titleParts.push(displayFilename);
                if (size)
                  titleParts.push(size);
                const finalTitle = titleParts.join("\n");
                const name = "DVDPlay - HubCloud" + qualityLabel;
                return {
                  name,
                  title: finalTitle,
                  url: resolvedUrl,
                  quality: quality ? quality + "p" : "Unknown",
                  size: size || null,
                  fileName: null,
                  type: "direct"
                };
              });
            });
          }
          return getFilenameFromUrl(buttonLink).then((actualFilename) => {
            const displayFilename = actualFilename || headerDetails || "Unknown";
            let finalQuality = quality;
            if (!finalQuality) {
              finalQuality = getIndexQuality(displayFilename);
            }
            if (!finalQuality && headerDetails) {
              finalQuality = getIndexQuality(headerDetails);
            }
            const finalQualityLabel = finalQuality ? " - " + finalQuality + "p" : " - Unknown";
            const titleParts = [];
            if (displayFilename)
              titleParts.push(displayFilename);
            if (size)
              titleParts.push(size);
            const finalTitle = titleParts.join("\n");
            let name;
            if (buttonText.includes("FSL Server"))
              name = "DVDPlay - FSL Server" + finalQualityLabel;
            else if (buttonText.includes("S3 Server"))
              name = "DVDPlay - S3 Server" + finalQualityLabel;
            else if (/pixeldra/i.test(buttonText) || /pixeldra/i.test(buttonLink))
              name = "DVDPlay - Pixeldrain" + finalQualityLabel;
            else if (buttonText.includes("Download File"))
              name = "DVDPlay - HubCloud" + finalQualityLabel;
            else
              name = "DVDPlay - HubCloud" + finalQualityLabel;
            return {
              name,
              title: finalTitle,
              url: buttonLink,
              quality: finalQuality ? finalQuality + "p" : "Unknown",
              size: size || null,
              fileName: actualFilename || null,
              type: "direct"
            };
          }).catch(() => {
            const displayFilename = headerDetails || "Unknown";
            const titleParts = [];
            if (displayFilename)
              titleParts.push(displayFilename);
            if (size)
              titleParts.push(size);
            const finalTitle = titleParts.join("\n");
            const name = "DVDPlay - HubCloud" + qualityLabel;
            return {
              name,
              title: finalTitle,
              url: buttonLink,
              quality: quality ? quality + "p" : "Unknown",
              size: size || null,
              fileName: null,
              type: "direct"
            };
          });
        }
        const tasks = [];
        const cards = $$(".card");
        if (cards.length > 0) {
          cards.each(function(ci, card) {
            const $card = $$(card);
            const header = $card.find("div.card-header").text() || $$("div.card-header").first().text() || "";
            const size = $card.find("i#size").text() || $$("i#size").first().text() || "";
            const quality = getIndexQuality(header);
            const headerDetails = cleanTitle(header);
            let localBtns = $card.find("div.card-body h2 a.btn");
            if (localBtns.length === 0)
              localBtns = $card.find("a.btn, .btn, a[href]");
            localBtns.each(function(i, el) {
              const $btn = $$(el);
              const text = ($btn.text() || "").trim();
              let link = $btn.attr("href");
              if (!link)
                return;
              link = toAbsolute(link, href);
              const isPlausible = /(hubcloud|hubdrive|pixeldrain|buzz|10gbps|workers\.dev|r2\.dev|download|api\/file)/i.test(link) || text.toLowerCase().includes("download");
              if (!isPlausible)
                return;
              tasks.push(buildTask(text, link, headerDetails, size, quality));
            });
          });
        }
        if (tasks.length === 0) {
          let buttons = $$.root().find("div.card-body h2 a.btn");
          if (buttons.length === 0) {
            const altSelectors = ["a.btn", ".btn", "a[href]"];
            for (const selector of altSelectors) {
              buttons = $$.root().find(selector);
              if (buttons.length > 0)
                break;
            }
          }
          const size = $$("i#size").first().text() || "";
          const header = $$("div.card-header").first().text() || "";
          const quality = getIndexQuality(header);
          const headerDetails = cleanTitle(header);
          buttons.each(function(i, el) {
            const $btn = $$(el);
            const text = ($btn.text() || "").trim();
            let link = $btn.attr("href");
            if (!link)
              return;
            link = toAbsolute(link, href);
            tasks.push(buildTask(text, link, headerDetails, size, quality));
          });
        }
        if (tasks.length === 0)
          return [];
        return Promise.all(tasks).then((arr) => (arr || []).filter((x) => !!x));
      }).catch((error) => {
        console.error(`[DVDPlay] HubCloud extraction error for ${url}:`, error.message);
        return [];
      });
    }
    function makeHTTPRequest(url, options = {}) {
      const defaultHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none"
      };
      return fetch(url, __spreadProps(__spreadValues({}, options), {
        headers: __spreadValues(__spreadValues({}, defaultHeaders), options.headers),
        redirect: "follow"
      })).then((response) => {
        if (response.status === 500) {
          console.log(`[DVDPlay] Server error (500) for ${url}, this might be temporary`);
          throw new Error(`Server temporarily unavailable (HTTP 500)`);
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      }).catch((error) => {
        console.error(`[DVDPlay] Request failed for ${url}: ${error.message}`);
        throw error;
      });
    }
    function searchContent(title, year, mediaType) {
      const searchQuery = title.trim();
      const encodedQuery = searchQuery.replace(/\s+/g, "+");
      const searchUrl = `${BASE_URL}/search.php?q=${encodedQuery}`;
      console.log(`[DVDPlay] Searching for: "${searchQuery}" at ${searchUrl}`);
      return makeHTTPRequest(searchUrl).then((response) => response.text()).then((html) => {
        const moviePageRegex = /<a href="([^"]+)"[^>]*>\s*<p class="home">/g;
        const results = [];
        let match;
        while ((match = moviePageRegex.exec(html)) !== null) {
          const movieUrl = new URL(match[1], BASE_URL).href;
          results.push({
            title,
            // We'll extract the actual title later
            url: movieUrl
          });
        }
        console.log(`[DVDPlay] Found ${results.length} search results`);
        return results;
      }).catch((error) => {
        console.log(`[DVDPlay] Search failed: ${error.message}`);
        console.log(`[DVDPlay] Attempting fallback: browsing recent updates`);
        return searchFromMainPage(title, year).catch((fallbackError) => {
          console.error(`[DVDPlay] Fallback search also failed: ${fallbackError.message}`);
          return [];
        });
      });
    }
    function searchFromMainPage(title, year) {
      console.log(`[DVDPlay] Searching main page for "${title}"`);
      return makeHTTPRequest(BASE_URL).then((response) => response.text()).then((html) => {
        const movieLinkRegex = /<a href="(\/page-\d+-[^"]+)"[^>]*>([^<]+)</g;
        const results = [];
        let match;
        const titleLower = title.toLowerCase();
        while ((match = movieLinkRegex.exec(html)) !== null) {
          const pageUrl = new URL(match[1], BASE_URL).href;
          const pageTitle = match[2].trim();
          if (titleLower.split(" ").some(
            (word) => word.length > 2 && pageTitle.toLowerCase().includes(word)
          )) {
            results.push({
              title: pageTitle,
              url: pageUrl
            });
            console.log(`[DVDPlay] Found potential match: "${pageTitle}" at ${pageUrl}`);
          }
        }
        console.log(`[DVDPlay] Fallback search found ${results.length} potential matches`);
        return results;
      });
    }
    function extractDownloadLinks(pageUrl) {
      console.log(`[DVDPlay] Extracting download links from: ${pageUrl}`);
      return makeHTTPRequest(pageUrl).then((response) => response.text()).then((html) => {
        const downloadPageLinks = [];
        const htmlChunks = html.split('<div align="center">');
        for (const chunk of htmlChunks) {
          if (chunk.includes('<a class="touch"')) {
            const hrefMatch = chunk.match(/href="(\/download\/file\/[^"]+)"/);
            if (hrefMatch) {
              const fullLink = new URL(hrefMatch[1], BASE_URL).href;
              downloadPageLinks.push(fullLink);
            }
          }
        }
        console.log(`[DVDPlay] Found ${downloadPageLinks.length} download pages`);
        return downloadPageLinks;
      });
    }
    function processDownloadLink(downloadPageUrl) {
      console.log(`[DVDPlay] Processing download page: ${downloadPageUrl}`);
      return makeHTTPRequest(downloadPageUrl).then((response) => response.text()).then((downloadPageHtml) => {
        const hubCloudUrls = [];
        const hubCloudRegex = /<a href="(https?:\/\/hubcloud\.[^"]+)"/g;
        let hubCloudMatch;
        while ((hubCloudMatch = hubCloudRegex.exec(downloadPageHtml)) !== null) {
          hubCloudUrls.push(hubCloudMatch[1]);
        }
        console.log(`[DVDPlay] Found ${hubCloudUrls.length} HubCloud links in page`);
        const finalLinkPromises = hubCloudUrls.map((hubCloudUrl) => {
          return extractHubCloudLinks(hubCloudUrl).catch((err) => {
            console.error(`[DVDPlay] Failed to extract from ${hubCloudUrl}: ${err.message}`);
            return [];
          });
        });
        return Promise.all(finalLinkPromises).then((allFinalLinks) => allFinalLinks.flat());
      }).catch((error) => {
        console.error(`[DVDPlay] Error processing download link ${downloadPageUrl}: ${error.message}`);
        return [];
      });
    }
    function findBestMatch(results, query) {
      if (!results || results.length === 0)
        return null;
      if (results.length === 1)
        return results[0];
      var scored = results.map(function(r) {
        var score = 0;
        if (normalizeTitle(r.title) === normalizeTitle(query))
          score += 100;
        var sim = calculateSimilarity(r.title, query);
        score += sim * 50;
        if (normalizeTitle(r.title).indexOf(normalizeTitle(query)) !== -1)
          score += 15;
        var lengthDiff = Math.abs(r.title.length - query.length);
        score += Math.max(0, 10 - lengthDiff / 5);
        if (/(19|20)\d{2}/.test(r.title))
          score += 5;
        return { item: r, score };
      });
      scored.sort(function(a, b) {
        return b.score - a.score;
      });
      return scored[0].item;
    }
    function parseQualityForSort(qualityString) {
      const match = (qualityString || "").match(/(\d{3,4})p/i);
      return match ? parseInt(match[1], 10) : 0;
    }
    function getTMDBDetails(tmdbId, mediaType) {
      var url = "https://api.themoviedb.org/3/" + mediaType + "/" + tmdbId + "?api_key=" + TMDB_API_KEY;
      return makeHTTPRequest(url).then(function(res) {
        return res.json();
      }).then(function(data) {
        if (mediaType === "movie") {
          return { title: data.title, original_title: data.original_title, year: data.release_date ? data.release_date.split("-")[0] : null };
        } else {
          return { title: data.name, original_title: data.original_name, year: data.first_air_date ? data.first_air_date.split("-")[0] : null };
        }
      }).catch(function() {
        return null;
      });
    }
    function validateVideoUrl(url, timeout = 1e4) {
      console.log(`[DVDPlay] Validating URL: ${url.substring(0, 100)}...`);
      return fetch(url, {
        method: "HEAD",
        headers: {
          "Range": "bytes=0-1",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        },
        signal: AbortSignal.timeout(timeout)
      }).then((response) => {
        if (response.ok || response.status === 206) {
          console.log(`[DVDPlay] \u2713 URL validation successful (${response.status})`);
          return true;
        } else {
          console.log(`[DVDPlay] \u2717 URL validation failed with status: ${response.status}`);
          return false;
        }
      }).catch((error) => {
        console.log(`[DVDPlay] \u2717 URL validation failed: ${error.message}`);
        return false;
      });
    }
    function getStreams2(tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) {
      console.log(`[DVDPlay] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
      var tmdbType = mediaType === "series" ? "tv" : mediaType;
      return getTMDBDetails(tmdbId, tmdbType).then(function(tmdb) {
        if (!tmdb || !tmdb.title)
          return [];
        console.log(`[DVDPlay] TMDB Info: "${tmdb.title}" (${tmdb.year})`);
        return searchContent(tmdb.title, tmdb.year, mediaType).then((searchResults) => {
          if (searchResults.length === 0) {
            console.log(`[DVDPlay] No search results found`);
            return [];
          }
          const selectedResult = findBestMatch(searchResults, tmdb.title);
          return extractDownloadLinks(selectedResult.url).then((downloadLinks) => {
            if (downloadLinks.length === 0) {
              console.log(`[DVDPlay] No download pages found`);
              return [];
            }
            const streamPromises = downloadLinks.map((link) => processDownloadLink(link));
            return Promise.all(streamPromises).then((nestedStreams) => {
              let allStreams = nestedStreams.flat();
              allStreams = allStreams.filter((stream) => {
                const url = stream.url.toLowerCase();
                return !url.includes("cdn.ampproject.org") && !url.includes("bloggingvector.shop") && !url.includes("winexch.com");
              });
              const uniqueStreams = Array.from(new Map(allStreams.map((stream) => [stream.url, stream])).values());
              console.log(`[DVDPlay] Validating ${uniqueStreams.length} stream URLs...`);
              const validationPromises = uniqueStreams.map((stream) => {
                try {
                  if (typeof URL_VALIDATION_ENABLED !== "undefined" && !URL_VALIDATION_ENABLED) {
                    console.log(`[DVDPlay] \u2713 URL validation disabled, accepting stream`);
                    return Promise.resolve(stream);
                  }
                  return validateVideoUrl(stream.url, 8e3).then((isValid) => {
                    if (isValid) {
                      return stream;
                    } else {
                      console.log(`[DVDPlay] \u2717 Filtering out invalid stream: ${stream.name}`);
                      return null;
                    }
                  }).catch((error) => {
                    console.log(`[DVDPlay] \u2717 Validation error for ${stream.name}: ${error.message}`);
                    return null;
                  });
                } catch (error) {
                  console.log(`[DVDPlay] \u2717 Validation error for ${stream.name}: ${error.message}`);
                  return Promise.resolve(null);
                }
              });
              return Promise.all(validationPromises).then((validatedStreams) => {
                const validStreams = validatedStreams.filter((stream) => stream !== null);
                validStreams.sort((a, b) => {
                  const qualityA = parseQualityForSort(a.quality);
                  const qualityB = parseQualityForSort(b.quality);
                  return qualityB - qualityA;
                });
                console.log(`[DVDPlay] Successfully processed ${validStreams.length} valid streams (${uniqueStreams.length - validStreams.length} filtered out)`);
                return validStreams;
              });
            });
          });
        });
      }).catch(function(error) {
        console.error(`[DVDPlay] Error in getStreams: ${error.message}`);
        return [];
      });
    }
    if (typeof module2 !== "undefined" && module2.exports) {
      module2.exports = { getStreams: getStreams2, extractHubCloudLinks, searchContent, extractDownloadLinks, processDownloadLink };
    } else {
      global.getStreams = getStreams2;
      global.extractHubCloudLinks = extractHubCloudLinks;
      global.searchContent = searchContent;
      global.extractDownloadLinks = extractDownloadLinks;
      global.processDownloadLink = processDownloadLink;
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

// src/dvdplay/index.js
var { getStreams: scrape } = require_core();
var { validateStreams } = require_validate();
function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve(scrape(tmdbId, mediaType, season, episode)).then(function(streams) {
    return validateStreams(streams);
  });
}
module.exports = { getStreams };
