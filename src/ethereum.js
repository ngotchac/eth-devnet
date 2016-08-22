let Web3 = require('web3');

module.exports = class Ethereum {

    static getInfos(nodeIp) {
        let web3 = new Web3(
            new Web3.providers.HttpProvider('http://' + nodeIp + ':8545')
        );

        let methods = [
            { name: 'net.getPeerCount', key: 'peers' },
            { name: 'eth.getBlockNumber', key: 'blockNumber' },
            { name: 'eth.getHashrate', key: 'hashrate' },
            { name: 'eth.getGasPrice', key: 'gasprice' },
            { name: 'eth.getAccounts', key: 'accounts' }
        ];

        return Promise
            .all(methods.map(m => {
                let object = m.name.split('.')[0];
                let method = m.name.split('.')[1];

                return Ethereum.promisfy(web3, object, method);
            }))
            .then(results => {
                return methods.reduce((cur, method, idx) => {
                    cur[method.key] = results[idx];
                    return cur;
                }, {});
            })
            .then(results => {
                return Ethereum
                    .getBalances(web3, results.accounts)
                    .then(accounts => {
                        results.accounts = accounts;
                        return results;
                    });
            });
    }

    static promisfy(web3, object, method, arg) {
        return new Promise((resolve, reject) => {
            let args = [].concat(arg || [], (err, result) => {
                if (err) return reject(err);
                return resolve(result);
            });

            web3[object][method].apply(null, args);
        });
    }

    static getBalances(web3, accounts) {
        let promises = accounts.map(account => {
            return Ethereum
                .promisfy(web3, 'eth', 'getBalance', account)
                .then(balance => balance.toNumber())
                .then(balance => ({
                    address: account, balance
                }));
        });

        return Promise.all(promises);
    }

};

