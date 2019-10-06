const Promise = require("bluebird");
global.Promise = Promise;

const fs = Promise.promisifyAll(require("fs"));
const path = require("path");
const os = require("os");
let config;
const sizeOf = Promise.promisify(require("image-size"));

/**
 * This Function recursively removes invalid pictures form a root directory 
 * @param {string} directory - The directory to recursively check
 * @param {object} config the config object
 * @returns {Promise}
 */
function removeInvalidPictures(directory, config) {
    console.debug(`Reading content of ${directory}...`);

    return fs.readdirAsync(directory).tap(arr => { console.debug(`Found ${arr.length} files.`) }).each(fileName => {

        let filePath = path.join(directory, fileName);

        return fs.statAsync(filePath).then(stat => {

            if (stat.isDirectory()) {
                console.debug(`File ${filePath} is a directory.`);
                return removeInvalidPictures(filePath,config);
            }
            else {

                return sizeOf(filePath).tap(dim => { console.debug(`File ${filePath} is an image of dimension (${dim.width}x${dim.height}).`) }).then(dim => {

                    // Check if in landscape mode
                    if(config.OnlyLandscape) {
                        if (dim.height > dim.width) {
                            console.debug(`Picture ${filePath} is in portrait. Deleting file`);
                            return fs.unlinkAsync(filePath).then(() => {
                                console.debug(`File ${filePath} Deleted`);
                            });
                        }
                    }
               
                    // Check if pictures meets required sizes
                    if (config.UseMinimumSize) {
                        const minimalSizeMultiplier = (config.PicMinimumSizePercents / 100);
                        if ((dim.height < (minimalSizeMultiplier * config.ScreenHeight)) || (dim.width < (minimalSizeMultiplier * config.ScreenWidth))) {
                            console.debug(`Picture ${filePath} is too small. Deleting file`);
                            return fs.unlinkAsync(filePath).then(() => {
                                console.debug(`File ${filePath} Deleted`);
                            });
                        }
                    }

                }).catch(err => {
                    if (!(err instanceof TypeError)) {
                        throw err;
                    }
                })

            }

        })

    })
}

/**
 * This function launches the clean-up process
 * @param {object} config the config object
 * @returns {Promise}
 */
function runJob(config) {
    const downloadedPath = config.DownloadPath;
    console.debug("Cleaning-up portrait background images");
    return removeInvalidPictures(downloadedPath,config);
}

module.exports = runJob;