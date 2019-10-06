const Promise = require("bluebird");
global.Promise = Promise;

/** @type {import("../node_modules/moment/moment")} */
const moment = require("moment");
const fs = Promise.promisifyAll(require("fs"));
const path = require("path");
const Case = require("case");
const du = require("du");
const rp = require("request-promise");
const request = require("request");
const { Tools } = require("../tools/tools");
const cheerio = require("cheerio");

/**
 * This function downloads a picture form an URL to a specific directory
 * @param {object} opts
 * @param {string} opts.url The picture's URL address
 * @param {string} opts.title The picture's title
 * @param {string} opts.caption The picture's caption
 * @param {string} opts.credit The picture's credit
 * @param {string} opts.dirToUse The directory where to save the picture
 * @param {object} opts.config the config object
 * @returns {Promise}
 */
function downloadPicture({ url, title, caption, credit, dirToUse, config }) {

    let usedURL = new URL(url);

    console.log(`Requesting ${url} headers...`);

    return rp.head({
        uri: url,
        resolveWithFullResponse: true
    }).then(res => {
        let imgType = res.caseless.get("Content-Type").split("/")[1];
        let filePath = path.join(config.DownloadPath, config.FetcherDir, dirToUse, `${Case.snake(title)}.${imgType}` );

        console.debug(`Got ${usedURL.hostname} response!`)

        return Promise.try(() => {
            console.debug(`Checking whenever or not file ${filePath} exists`);
            return fs.accessAsync(filePath, fs.constants.F_OK).then(() => true, (err) => false )
        }).then((exists) => {

            if (!exists) {

                console.debug(`Picture is a ${imgType} and will be place at ${filePath}`);

                return new Promise((resolve, reject) => {
                    request(url)
                        .on("data", b => { console.debug(`Got ${b.length} datas`) })
                        .on("complete", () => { console.debug(`Completed downloading the picture at ${usedURL.hostname}!`); resolve() })
                        .on("error", reject)
                        .pipe(fs.createWriteStream(filePath))
                });

            } else {
                console.log(`Picture ${Case.snake(title)}.${imgType} already exists. Nothing to do...`);
                return Promise.resolve();
            }

        }).then(()=>removeOlderPictures(dirToUse, config));

    });
}

/**
 * This Function is run to clean the directories when they're full.
 * @param {string} dirToUse Which directory to clean
 * @param {object} config the config object
 * @returns {Promise}
 */
function removeOlderPictures(dirToUse, config) {
    const filePath = path.join(config.DownloadPath, config.FetcherDir, dirToUse);
    
    console.log(`Clearing up ${dirToUse} directory`);

    return du(filePath).then(size=>{

        console.debug(`${filePath} is ${size} bytes long`);

        if(size >= config.DirSizeQuota ) {

            console.log(`${filePath} needs to be purged`);

            return fs.readdirAsync(filePath).call("sort", (a, b) => fs.statSync(path.join(filePath, b)).birthtimeMs - fs.statSync(path.join(filePath, a)).birthtimeMs).spread(first => {
                let fullFilePath = path.join(filePath, first);
                console.log(`removing ${fullFilePath}`);
                return fs.unlinkAsync(fullFilePath);
            }).then(()=>removeOlderPictures(dirToUse, config));
        } else {
            return Promise.resolve();
        }
        
    });
}

/**
 * Fetches pictures of the day form National Geographic 
 * @param {string} dateString Today's formatted date 
 * @param {object} config the config object
 * @returns {Promise}
 */
function fetchNatGeoData(dateString, config) {
    let nationalGeographicURL = `${config.NationalGeographic.Url}.${["gallery", dateString, "json"].join(".")}`;
    let usedURL = new URL(nationalGeographicURL);

    console.log(`Fetching a picture at ${usedURL.origin}...`);

    return rp({
        uri: nationalGeographicURL,
        json: true
    })
        .then((data) => {

            console.debug(`Got ${usedURL.hostname} response!`)

            if (!Tools.isNullUndefinedOrEmpty(data.items)) {

                let currentPhoto = data.items[0];

                return Promise.resolve({
                    caption : currentPhoto.caption,
                    title : Case.kebab(currentPhoto.title),
                    credit : currentPhoto.credit,
                    url : currentPhoto.sizes[config.NationalGeographic.DownloadSize.toString()] || currentPhoto.sizes['1600'],
                    dirToUse: config.NationalGeographic.Dir,
                    config
                }).tap(i=>{ console.debug(`Found picture "${i.title}"`) })

            } else {
                throw new Error(`No pictures were found while calling ${usedURL.origin}`);
            }

        })
        .then(downloadPicture)
}

/**
 * Fetches pictures of the day form Le Clair photos
 * @param {object} config the config object
 * @returns {Promise}
 */
function fetchLeClairPhotoData(config) {
    
    let usedURL = new URL(config.LeClairPhoto.Url);

    console.log(`Fetching a picture at ${usedURL.origin}...`);

    return rp({
        uri: config.LeClairPhoto.Url
    })
        .then((data) => {

            console.debug(`Got ${usedURL.hostname} response!`)

            const $ = cheerio.load(data);

            let img = $(".container img").first();

            let title =  Case.title(img.parent().parent().parent().prev().find(".text_content strong").text());
            let caption =  img.parent().parent().parent().prev().find(".text_content p").last().text();
            let credit =  $('meta[name="image_protection_blurb"]').attr("content");
            let url = img.attr("data-src");

             return Promise.resolve({
                caption,
                title : Case.kebab(title),
                credit,
                url,
                dirToUse: config.LeClairPhoto.Dir,
                config
            }).tap(i=>{ console.debug(`Found picture "${i.title}"`) }) 

        })
        .then(downloadPicture)
}

/**
 * Fetches pictures of the day form Windows Spotlight
 * @param {string} dateJSON Today's JSON date
 * @param {object} config the config object
 * @returns {Promise}
 */
function fetchWindowsSpotlightData(dateJSON, config) {

    let usedURL = new URL(config.WindowsSpotlight.Url);

    console.log(`Fetching a picture at ${usedURL.origin}...`);

    return rp({
        uri: `${config.WindowsSpotlight.Url}${dateJSON}`,
        json: true
    })
        .then((data) => {

            console.debug(`Got ${usedURL.hostname} response!`)

            if (!Tools.isNullUndefinedOrEmpty(data.batchrsp)) {

                let item = JSON.parse(data.batchrsp.items[0].item);
                
                return Promise.resolve({
                    url : item.ad.image_fullscreen_001_landscape.u,
                    title : Case.kebab(item.ad.title_text.tx),
                    caption : item.ad.hs1_title_text.tx,
                    credit : item.ad.copyright_text.tx,
                    dirToUse: config.WindowsSpotlight.Dir,
                    config
                }).tap(i=>{ console.debug(`Found picture "${i.title}"`) })

            } else {
                throw new Error(`No pictures were found while calling ${usedURL.origin}`);
            }

        })
        .then(downloadPicture)
}

/**
 * This function launches the fetching process
 * @param {object} config the config object
 * @returns {Promise}
 */
function runJob(config) {
    let today = moment();
    let date = today.format("YYYY-MM");

    console.debug(`Today's date: ${date}`);

    return Promise.all([

        // National Geographic fetch
        fetchNatGeoData(date, config),
        
        // National Geographic fetch
        fetchLeClairPhotoData(config),

        // Windows Spotlight fetch
        fetchWindowsSpotlightData(today.toJSON(), config)

    ]);
}

module.exports = runJob;