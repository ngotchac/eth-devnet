let program = require('commander'),
    log = require('npmlog');

let DockerImages = require('./src/docker-images');

const LOG_PREFIX = 'eth-devnet/main';
const CLIENTS = [ 'parity' ];

program
    .version(require('./package.json').version);

program
    .command('start')
    .description('start a new Etehereum Nodes Network for development')
    .option('-N, --nodes <nodes_number>', '[default: 3] number of running nodes.', parseInt)
    .option('-M, --miners <miners_number>', '[default: 1] number of running miners.', parseInt)
    .option('-C, --client <client>', '[default: "parity"] which client to run. choose: ' + CLIENTS.join(', '))
    .action(action => {
        let nodes = action.nodes !== undefined ? action.nodes : 3,
            miners = action.miners !== undefined ? action.miners : 1,
            client = action.client !== undefined ? action.client : 'parity';

        if (!(nodes >= 1 && nodes <= 5)) {
            log.error('', 'The number of nodes must be between 1 and 5', `(${nodes} given)`);
            process.exit(1);
        }

        if (!(miners >= 1 && miners <= 5)) {
            log.error('', 'The number of miners must be between 1 and 5', `(${miners} given)`);
            process.exit(1);
        }

        if (CLIENTS.indexOf(client) === -1) {
            log.error('', 'The client should be one of this list: ' + CLIENTS.join(', '), `("${client}" given)`);
            process.exit(1);
        }
    });

program
    .command('stop')
    .description('stop the current Etehereum Nodes Network')
    .action(() => {
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

