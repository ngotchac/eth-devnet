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
        let toPrint = '';

        toPrint += `> ${chalk.green.bold(infos.name)} @ ${infos.ip}:\n`;

        toPrint += '  ';
        toPrint += `Peers: ${chalk.bold(infos.peers)} - `;
        toPrint += `Blocks: ${chalk.bold(infos.blockNumber)} - `;
        toPrint += `Hashrate: ${chalk.bold(hashrate.number)} ${hashrate.prefix}H/s`;
        toPrint += '\n';

        toPrint += '  Accounts:\n';

        infos.accounts.forEach(account => {
            let balance = Utils.readableNumber(account.balance);

            toPrint += '    * ';
            toPrint += `${chalk.yellow(account.address)}  `;
            toPrint += `${chalk.bold(balance.number)} ${balance.prefix}ETH`;
            toPrint += '\n';
        });

        toPrint += '\n';

        return toPrint;
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
