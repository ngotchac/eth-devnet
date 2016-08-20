let program = require('commander'),
    log = require('npmlog');

let DockerImages = require('../src/docker-images');
let DockerNetwork = require('../src/docker-network');

const LOG_PREFIX = 'eth-devnet/init';

program
    .description('initialize the current machine with the Docker Images')
    .parse(process.argv);

DockerImages
    .checkImages()
    .then(() => DockerNetwork.checkNetwork())
    .then(() => log.info(LOG_PREFIX, 'everything is setup and good to go!'))
    .catch(e => log.error(LOG_PREFIX, e));
