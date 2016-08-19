var Docker = require('dockerode'),
    log = require('npmlog');

const NETWORK_VERSION = 2;
const NETWORK_PREFIX = '172.26.0';

const LOG_PREFIX = 'eth-devnet/docker-network';

let docker = new Docker();

module.exports = class DockerNetwork {

    static getName() {
        return 'eth-devnet';
    }

    static getIpAddress() {
        let regex = /^(?:[0-9]{1,3}\.){3}([0-9]{1,3})/;

        return new Promise((resolve, reject) => {
            docker
                .getNetwork(DockerNetwork.getName())
                .inspect((err, result) => {
                    if (err) return reject(err);

                    let containers = result.Containers;

                    let usedIps = Object
                        .keys(containers)
                        .map(k => containers[k].IPv4Address)
                        .map(a => regex.exec(a)[1]);

                    let ip;

                    while (!ip) {
                        // We cannot use 0 nor 1 (Host IP)
                        let r = Math.round(Math.random() * 252) + 2;
                        if (usedIps.indexOf(r) === -1) {
                            ip = NETWORK_PREFIX + '.' + r;
                        }
                    }

                    return resolve(ip);
                });
        });
    }

    static checkNetwork() {
        log.info(LOG_PREFIX, 'checking the Docker networks');

        return new Promise((resolve, reject) => {
            docker.listNetworks((err, networks) => {
                if (err) return reject(err);

                // Find the network in the network list
                let network = networks
                    .find(n => n.Name === DockerNetwork.getName());

                // If not found, create it
                if (!network) {
                    return DockerNetwork
                        .create()
                        .then(resolve, reject);
                }

                // Check the version of the found network
                let version = parseInt(network.Labels.version);
                if (version < NETWORK_VERSION) {
                    return DockerNetwork
                        .remove(network)
                        .then(() => DockerNetwork.create())
                        .then(resolve, reject);
                }

                // Everything is fine
                return resolve();
            });
        });
    }

    static create() {
        log.info(LOG_PREFIX, 'creating the Docker network');

        return new Promise((resolve, reject) => {
            docker.createNetwork({
                Name: DockerNetwork.getName(),
                Driver: 'bridge',
                IPAM:{
                    Config:[
                        { Subnet: NETWORK_PREFIX + '.0/24' }
                    ]
                },
                EnableIPv6: false,
                Options: {
                    // Name in Host OS (eg. in `ifconfig`)
                    'com.docker.network.bridge.name': 'eth-devnet'
                },
                Labels: { version: NETWORK_VERSION.toString() }
            }, err => {
                if (err) return reject(err);
                return resolve();
            });
        });
    }

    static remove(network) {
        log.info(LOG_PREFIX, `removing the old Docker network "${network.Name}"`);

        return new Promise((resolve, reject) => {
            // Simply remove the network
            docker.getNetwork(network.Id).remove(err => {
                if (err) return reject(err);
                return resolve();
            });
        });
    }

};
