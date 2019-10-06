#!/usr/bin/env node
const Promise = require("bluebird");
global.Promise = Promise;

require("./tools/config")()
    .then(config => Promise.all([
        require("./prc/init")(config),
        require("./prc/fetch")(config),
        require("./prc/cleanup")(config)
    ]))
    .then(() => { process.exit() })
    .catch(err => {
        console.error(err);
        process.exit(1)
    })


