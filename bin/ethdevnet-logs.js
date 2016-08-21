let program = require('commander'),
    inquirer = require('inquirer'),
    log = require('npmlog');

let DockerPs = require('../src/docker-ps');

const LOG_PREFIX = 'eth-devnet/status';

program
    .description('print out the logs of the chosen Node or Miner')
    .parse(process.argv);

return DockerPs
    .getContainers()
    .then(containers => {
        let question = {
            type: 'list',
            name: 'container',
            message: 'choose the container to pull to logs from',
            choices: [].concat(
                containers.nodes.map(c => ({
                    name: c.Names[0],
                    value: c
                })),

                new inquirer.Separator(),

                containers.miners.map(c => ({
                    name: c.Names[0],
                    value: c
                }))
            )
        };

        return inquirer.prompt(question);
    })
    .then(result => {
        return DockerPs.getLogs(result.container);
    })
    .then(logs => {
        logs.forEach(log => {
            process[log.from].write(log.log + '\n');
        });
    })
    .catch(e => log.error(LOG_PREFIX, e));
