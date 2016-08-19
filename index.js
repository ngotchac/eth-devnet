let program = require('commander'),
    log = require('npmlog');

let DockerImages = require('./src/docker-images');
let DockerPs = require('./src/docker-ps');

const LOG_PREFIX = 'eth-devnet/main';

program
    .version(require('./package.json').version);

program
    .command('start')
    .description('start a new Etehereum Nodes Network for development')
    .option('-N, --nodes <nodes_number>', '[default: 3] number of running nodes.', parseInt)
    .option('-M, --miners <miners_number>', '[default: 1] number of running miners.', parseInt)
    .option('-C, --client <client>', '[default: "parity"] which client to run. choose: parity')
    .action(action => {
        let nodes = action.nodes,
            miners = action.miners,
            client = action.client;

        DockerPs
            .start({
                nodes, miners, client
            })
            .then(() => log.info(LOG_PREFIX, 'Success'))
            .catch(e => log.error(LOG_PREFIX, e));
    });

program
    .command('stop')
    .description('stop the current Etehereum Nodes Network')
    .action(() => {
        DockerPs
            .cleanUp()
            .then(() => log.info(LOG_PREFIX, 'Success'))
            .catch(e => log.error(LOG_PREFIX, e));
    });

program
    .command('status')
    .description('get the current status of the Etehereum Nodes Network')
    .action(() => {
        DockerImages
            .checkImages()
            .then(() => log.info(LOG_PREFIX, 'Success'))
            .catch(e => log.error(LOG_PREFIX, e));
    });

program
    .command('init')
    .description('initialize the current machine with the Docker Images')
    .action(() => {
        DockerImages
            .checkImages()
            .then(() => log.info(LOG_PREFIX, 'everything is setup and good to go!'))
            .catch(e => log.error(LOG_PREFIX, e));
    });

program.parse(process.argv);

