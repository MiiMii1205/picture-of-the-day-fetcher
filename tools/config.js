
const Promise = require("bluebird");
global.Promise = Promise;

const exec = Promise.promisify(require("child_process").exec);
const ini = require("ini");
const fs = Promise.promisifyAll(require("fs"));
const os = require("os");
const path = require("path");

const possibleNationalGeographicPictureSize = [
    240,
    320,
    500,
    640,
    800,
    1024,
    1600,
    2048,
];

function dealWithError(err) {
    if (err && err.code !== 'ENOENT') {
        throw err;
    }
}

/* Default settings */
let config = {
    "ScreenWidth": 900,
    "ScreenHeight": 1600,
    "UseVarietyConfig": true,
    "AutoScreenResolution": true,
    "FetcherDir": "picture-of-the-day-fetcher",
    "DownloadPath": ".config/variety/Downloaded",
    "DirSizeQuota": 500000000,
    "UseMinimumSize": false,
    "PicMinimumSizePercents": 50,
    "OnlyLandscape": true,

    "NationalGeographic": {
        "Url": "https://www.nationalgeographic.com/photography/photo-of-the-day/_jcr_content/",
        "AutoDownloadSize": true,
        "DownloadSize": 2048,
        "Dir": "national-geographic",
    },
    "LeClairPhoto": {
        "Url": "https://www.leclairphoto.com/photo-du-jour",
        "Dir": "le-clair-photo",
    },
    "WindowsSpotlight": {
        "Url": `https://arc.msn.com/v3/Delivery/Cache?pid=209567&fmt=json&rafb=0&ua=WindowsShellClient%2F0&disphorzres=${this.ScreenWidth}&dispvertres=${this.ScreenHeight}&lo=80217&pl=fr-CA&lc=fr-CA&ctry=ca&time=`,
        "Dir": "windows-spotlight"
    }

}

// check if user config exists

/**
 * This function initializes the config object
 * @returns {Promise<object>}
 */
function InitConfig() {

    const generalConfigFile = path.join("/etc", "picture-of-the-day-fetcher.conf");
    const userConfigFilePath = path.join(os.homedir(), ".config", "picture-of-the-day-fetcher.conf");
    const varietyConfigFilePath = path.join(os.homedir(), ".config", "variety", "variety.conf");

    return fs.readFileAsync(generalConfigFile, 'utf8')
        .then(d => { Object.assign(config, ini.parse(d)); }, dealWithError)
        .then(() => fs.readFileAsync(userConfigFilePath, 'utf8'))
        .then(d => { Object.assign(config, ini.parse(d)); }, dealWithError)
        .then(() => {

            // Trying to fetch the user's screen resolution
            if (config.AutoScreenResolution) {

                if (process.env.XDG_SESSION_TYPE === "xorg") {

                    // They're on X11
                    return exec("xrandr | awk '/primary/{print $4}'").then((stdout, stderr) => {
                        let [width, height] = stdout.split("+")[0].split("x");
                        config.ScreenWidth = width;
                        config.ScreenWidth = height;
                    });

                } else if (process.env.XDG_SESSION_TYPE === "wayland") {

                    // They're on wayland
                    switch (process.env.XDG_SESSION_DESKTOP) {

                        case "sway":

                            // let's use swaymsg get_output
                            return exec("swaymsg -p -t get_outputs | awk '/Current mode/{print $3}'").then((stdout, stderr) => {
                                let [width, height] = stdout.split("x");
                                config.ScreenWidth = width;
                                config.ScreenWidth = height;
                            });

                        default:
                            // They're probably have x installed anyways...
                            return exec("xrandr | awk '/primary/{print $4}'").then((stdout, stderr) => {
                                let [width, height] = stdout.split("+")[0].split("x");
                                config.ScreenWidth = width;
                                config.ScreenWidth = height;
                            });

                    }

                }

            }

        })

        .then(() => {

            // Let's update the National Geographic download size!
            if (config.AutoDownloadSize) {

                let usedSize = config.ScreenWidth;
                let currentDownloadSize = possibleNationalGeographicPictureSize[0];

                for (let i = 0, length = possibleNationalGeographicPictureSize.length; i < length; ++i) {
                    let size = possibleNationalGeographicPictureSize[i];

                    if (usedSize <= size) {
                        break;
                    }

                    currentDownloadSize = size;

                }

                config.NationalGeographic.DownloadSize = currentDownloadSize;

            }

        })

        .then(() => {

            // Sync with Variety's config
            if (config.UseVarietyConfig) {
                return fs.readFileAsync(varietyConfigFilePath, 'utf8')
                    .then(d => {
                        let varietyConfigs = ini.parse(d);
                        config.DownloadPath = varietyConfigs.download_folder.replace(/^~/ig, os.homedir());

                        if (varietyConfigs.quota_enable) {
                            config.DirSizeQuota = varietyConfigs.quota_size * 1000000;
                        }

                        config.UseMinimumSize = varietyConfigs.min_size_enabled

                        if (config.UseMinimumSize) {
                            config.PicMinimumSizePercents = 50;
                        }

                        config.OnlyLandscape = varietyConfigs.use_landscape_enabled;

                    }, dealWithError);
            }

        })

        .then(() => { config.WindowsSpotlight.Url = config.WindowsSpotlight.Url.replace(/\${this.ScreenWidth}/ig, config.ScreenWidth).replace(/\${this.ScreenHeight}/ig, config.ScreenHeight); })
        .return(config);
}

module.exports = InitConfig;