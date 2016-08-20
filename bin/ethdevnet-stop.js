let program = require('commander'),
    log = require('npmlog');

let DockerPs = require('../src/docker-ps');

const LOG_PREFIX = 'eth-devnet/stop';

program
    .description('stop the current Etehereum Nodes Network')
    .parse(process.argv);

DockerPs
    .cleanUp()
    .then(() => log.info(LOG_PREFIX, 'stopped and cleaned all containers'))
    .catch(e => log.error(LOG_PREFIX, e));
