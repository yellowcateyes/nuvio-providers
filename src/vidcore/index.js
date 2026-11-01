// Wraps the provider's scraper so only streams that actually respond are returned,
// best quality and fastest first (see src/_shared/validate.js).
const { getStreams: scrape } = require('./core.js');
const { validateStreams, dropWrongYear, dropIndianLanguages } = require('../_shared/validate.js');

function getStreams(tmdbId, mediaType, season, episode) {
    return Promise.resolve(scrape(tmdbId, mediaType, season, episode)).then(function (streams) {
        return dropWrongYear(dropIndianLanguages(streams), tmdbId, mediaType);
    }).then(function (streams) {
        return validateStreams(streams);
    });
}

module.exports = { getStreams };
