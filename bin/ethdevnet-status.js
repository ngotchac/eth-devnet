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
    let toPrint = '';

    return DockerPs
        .getContainers()
        .then(containers => {
            let nodes = containers.nodes;
            let miners = containers.miners;

            toPrint += `${nodes.length} running node(s), `;
            toPrint += `and ${miners.length} running miner(s)\n`;

            toPrint += '\n';

            let netName = DockerNetwork.getName();
            let p = Promise.resolve();

            nodes.forEach(c => {
                let ip = c.NetworkSettings.Networks[netName].IPAddress;
                let name = c.Names[0];

                p = p
                    .then(() => Ethereum.getInfos(ip))
                    .catch(e => {
                        if (e.code !== 'ECONNREFUSED') {
                            // throw e;
                        }
                    })
                    .then(infos => {
                        if (!infos) return true;

                        infos.name = name;
                        infos.ip = ip;

                        toPrint += Utils.printNodeInfos(infos);
                    });
            });

            return p.then(() => toPrint);
        })
        .catch(e => log.error(LOG_PREFIX, e));
}

if (program.F === undefined) {
    return printStatus().then(toPrint => process.stdout.write(toPrint));
} else {
    // process.stdout.write('\033c');
    return printLoop();
}

var printedLines = 0;

function printLoop() {
    printStatus()
        .then(toPrint => {
            // Print new lines to erase previous lines
            for (let i = 0; i < printedLines; i++) {
                for (let j = 0; j < process.stdout.columns; j++) {
                    process.stdout.write(' ');
                }

                process.stdout.write('\n');
            }
            process.stdout.moveCursor(0, -1 * printedLines);

            printedLines = toPrint.split('\n').length;
            process.stdout.write(toPrint);
            process.stdout.moveCursor(0, -1 * printedLines + 1);

            setTimeout(() => {
                printLoop();
            }, 500);
        })
        .catch(e => log.error(LOG_PREFIX, e));
}
