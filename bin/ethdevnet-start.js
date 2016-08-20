let program = require('commander'),
    log = require('npmlog');

let DockerPs = require('../src/docker-ps');

const LOG_PREFIX = 'eth-devnet/start';

program
    .description('start a new Etehereum Nodes Network for development')
    .option('-N, --nodes <nodes_number>', '[default: 3] number of running nodes.', parseInt)
    .option('-M, --miners <miners_number>', '[default: 1] number of running miners.', parseInt)
    .option('-C, --client <client>', '[default: "parity"] which client to run. choose: parity')
    .parse(process.argv);

let nodes = program.nodes,
    miners = program.miners,
    client = program.client;

DockerPs
    .start({
        nodes, miners, client
    })
    .then(() => log.info(LOG_PREFIX, 'Success'))
    .catch(e => log.error(LOG_PREFIX, e));
