let program = require('commander'),
    log = require('npmlog');

let DockerNetwork = require('../src/docker-network');
let DockerPs = require('../src/docker-ps');
let Ethereum = require('../src/ethereum');
let Utils = require('../src/utils');

const LOG_PREFIX = 'eth-devnet/status';

program
    .description('get the current status of the Etehereum Nodes Network')
    .option('-f', 'keep updating the status')
    .parse(process.argv);

function printStatus() {
    return DockerPs
        .getContainers()
        .then(containers => {
            let nodes = containers.nodes;
            let miners = containers.miners;

            log.info(
                LOG_PREFIX,
                `${nodes.length} running node(s),`,
                `and ${miners.length} running miner(s)`
            );

            process.stdout.write('\n');

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
}

if (program.F === undefined) {
    return printStatus();
} else {
    process.stdout.write('\033c');
    return printLoop();
}

function printLoop() {
    printStatus()
        .then(() => {
            setTimeout(() => {
                process.stdout.write('\033c');
                printLoop();
            }, 500);
        });
}
