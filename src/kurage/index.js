// Wraps the scraper so only streams that actually respond are returned (see src/_shared/validate.js).
const { getStreams: scrape } = require('./core.js');
const { validateStreams } = require('../_shared/validate.js');

function getStreams(tmdbId, mediaType, season, episode) {
    return Promise.resolve(scrape(tmdbId, mediaType, season, episode)).then(function (streams) {
        return validateStreams(streams);
    });
}

module.exports = { getStreams };
