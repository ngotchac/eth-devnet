let program = require('commander'),
    log = require('npmlog');

let DockerImages = require('./src/docker-images');
let DockerNetwork = require('./src/docker-network');
let DockerPs = require('./src/docker-ps');
let Ethereum = require('./src/ethereum');
let Utils = require('./src/utils');

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
        DockerPs
            .getContainers()
            .then(containers => {
                let nodes = containers.nodes;
                let miners = containers.miners;

                log.info(
                    LOG_PREFIX,
                    `${nodes.length} running node(s),`,
                    `and ${miners.length} running miner(s)`
                );

                let netName = DockerNetwork.getName();
                let p = Promise.resolve();

                nodes.forEach(c => {
                    let ip = c.NetworkSettings.Networks[netName].IPAddress;
                    let name = c.Names[0];

                    p = p
                        .then(() => Ethereum.getInfos(ip))
                        .then(infos => {
                            infos.name = name;
                            infos.ip = ip;

                            Utils.printNodeInfos(infos);
                        });
                });

                return p;
            })
            .catch(e => log.error(LOG_PREFIX, e));
    });

program
    .command('init')
    .description('initialize the current machine with the Docker Images')
    .action(() => {
        DockerImages
            .checkImages()
            .then(() => DockerNetwork.checkNetwork())
            .then(() => log.info(LOG_PREFIX, 'everything is setup and good to go!'))
            .catch(e => log.error(LOG_PREFIX, e));
    });

program
    .command('help', { isDefault: true })
    .action(() => {
        program.outputHelp();
    });

program.parse(process.argv);

