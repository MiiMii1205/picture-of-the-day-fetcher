const Promise = require("bluebird");
global.Promise = Promise;

const fs = Promise.promisifyAll(require("fs"));
const path = require("path");
/**
 * This function initialises most of the program's directories 
 * @param {*} config - The config object
 * @returns {Promise}
 */
function runJob(config) {
    console.debug(`Initializing directories`);
    return Promise.all([

        // Initialize National Geographic directory
        fs.mkdirAsync(path.join( config.DownloadPath, config.FetcherDir, config.NationalGeographic.Dir ), { recursive: true } ),

        // Initialize Le clair photo directory
        fs.mkdirAsync(path.join( config.DownloadPath, config.FetcherDir, config.LeClairPhoto.Dir ), { recursive: true } ),

        // Initialize Windows Spotlight directory
        fs.mkdirAsync(path.join( config.DownloadPath, config.FetcherDir, config.WindowsSpotlight.Dir ), { recursive: true } )

    ]);
}

module.exports = runJob;