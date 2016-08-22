let program = require('commander'),
    log = require('npmlog');

let Accounts = require('../src/accounts');

const LOG_PREFIX = 'eth-devnet/accounts';

program
    .description('manage your Ethereum accounts');


program
    .command('list')
    .description('list your accounts')
    .action(() => {
        log.info(LOG_PREFIX, 'listing all accounts');

        return Accounts.list()
            .then(data => {
                log.info(LOG_PREFIX, data);
            })
            .catch(e => log.error(LOG_PREFIX, e));
    });

program
    .command('new')
    .description('create a new account')
    .action(() => {
        log.info(LOG_PREFIX, 'creating a new account');

        return Accounts.new()
            .then(data => {
                log.info(LOG_PREFIX, data);
            })
            .catch(e => log.error(LOG_PREFIX, e));
    });

program
    .action(() => {
        program.help();
    })
    .parse(process.argv);

