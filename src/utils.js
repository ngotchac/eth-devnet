let chalk = require('chalk'),
    path = require('path'),
    os = require('os');

module.exports = class Utils {

    static get appDir() {
        return path.resolve(os.homedir() + '/.eth-devnet');
    }

    get clients() {
        return [ 'parity' ];
    }

    static printNodeInfos(infos) {
        let hashrate = Utils.readableNumber(infos.hashrate);

        process.stdout.write(`> ${chalk.green.bold(infos.name)} @ ${infos.ip}:\n`);

        process.stdout.write('  ');
        process.stdout.write(`Peers: ${chalk.bold(infos.peers)} - `);
        process.stdout.write(`Blocks: ${chalk.bold(infos.blockNumber)} - `);
        process.stdout.write(`Hashrate: ${chalk.bold(hashrate.number)} ${hashrate.prefix}H/s`);
        process.stdout.write('\n');

        process.stdout.write('  Accounts:\n');

        infos.accounts.forEach(account => {
            let balance = Utils.readableNumber(account.balance);

            process.stdout.write('    * ');
            process.stdout.write(`${chalk.yellow(account.address)}  `);
            process.stdout.write(`${chalk.bold(balance.number)} ${balance.prefix}ETH`);
            process.stdout.write('\n');
        });

        process.stdout.write('\n');
    }

    static readableNumber(number) {
        number = parseFloat(number);

        if (number >= Math.pow(10, 12)) {
            return {
                number: number / Math.pow(10, 12),
                prefix: 'T'
            };
        }

        if (number >= Math.pow(10, 9)) {
            return {
                number: number / Math.pow(10, 9),
                prefix: 'G'
            };
        }

        if (number >= Math.pow(10, 6)) {
            return {
                number: number / Math.pow(10, 6),
                prefix: 'M'
            };
        }

        if (number >= Math.pow(10, 3)) {
            return {
                number: number / Math.pow(10, 3),
                prefix: 'K'
            };
        }

        return {
            number: number,
            prefix: ''
        };
    }

};
