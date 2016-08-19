let Docker = require('dockerode'),
    through2 = require('through2'),
    log = require('npmlog');

let DockerImages = require('./docker-images');

let docker = new Docker();

const LOG_PREFIX = 'eth-devnet/docker-ps';
const CONTAINER_PREFIX = 'eth-devnet_';

const CLIENTS = [ 'parity' ];

const DEFAULTS = {
    nodes: 3,
    miners: 1,
    client: 'parity'
};

module.exports = class DockerPs {

    static start(config) {
        let nodes = config.nodes !== undefined ? config.nodes : DEFAULTS.nodes,
            miners = config.miners !== undefined ? config.miners : DEFAULTS.miners,
            client = config.client !== undefined ? config.client : DEFAULTS.client;

        if (!(nodes >= 1 && nodes <= 5)) {
            log.error(LOG_PREFIX, 'The number of nodes must be between 1 and 5', `(${nodes} given)`);
            process.exit(1);
        }

        if (!(miners >= 1 && miners <= 5)) {
            log.error(LOG_PREFIX, 'The number of miners must be between 1 and 5', `(${miners} given)`);
            process.exit(1);
        }

        if (CLIENTS.indexOf(client) === -1) {
            log.error(LOG_PREFIX, 'The client should be one of this list: ' + CLIENTS.join(', '), `("${client}" given)`);
            process.exit(1);
        }

        let images = DockerImages.getImages();
        let nodeImage = images.find(i => i.name === client);
        let minerImage = images.find(i => i.name === 'ethminer');

        let author = '31f25b9CabB9803f5e36BD609ff1AFE5A779A7Ca';

        let nodeCmd = [].concat(
            nodeImage.meta.Cmd || [],
            [ '--author', author ]
        );

        // Start first Node after CleanUp
        return DockerPs
            .cleanUp()
            .then(() => {
                let ip = '172.26.0.2';

                log.info(LOG_PREFIX, 'starting the first node');

                return DockerPs
                    .startContainer({
                        Image: nodeImage.tag,
                        Cmd: [].concat(
                            nodeCmd,
                            [
                                '--jsonrpc-interface', `${ip}`
                            ]
                        ),
                        HostConfig: {
                            Binds: ['/home/nicolas/.parity:/parity'],
                            NetworkMode: 'ethereum'
                        },
                        name: CONTAINER_PREFIX + nodeImage.name + '.0'
                    });
            })
            .then(container => DockerPs.getNodeURI(container))
            .then(uri => {
                log.info(LOG_PREFIX, 'got main node URI: ' + uri);

                let p = Promise.resolve();

                // Start all nodes
                for (let i = 2; i <= nodes; i++) {
                    p = p.then(() => {
                        log.info(LOG_PREFIX, 'starting node #' + i);

                        let ip = '172.26.0.' + ( i+1 );

                        return DockerPs
                            .startContainer({
                                Image: nodeImage.tag,
                                Cmd: [].concat(
                                    nodeCmd,
                                    [
                                        '--jsonrpc-interface', `${ip}`,
                                        '--bootnodes', uri
                                    ]
                                ),
                                HostConfig: {
                                    Binds: ['/home/nicolas/.parity:/parity'],
                                    NetworkMode: 'ethereum'
                                },
                                name: CONTAINER_PREFIX + nodeImage.name + '.' + ( i-1 )
                            });
                    });
                }

                return p;
            })
            .then(() => {
                // Start the miner
                log.info(LOG_PREFIX, 'starting the miner');

                return DockerPs
                    .startContainer({
                        Image: minerImage.tag,
                        Cmd: [

                        ],
                        HostConfig: {
                            Binds: ['/home/nicolas/.parity:/parity'],
                            NetworkMode: 'ethereum'
                        },
                        name: CONTAINER_PREFIX + nodeImage.name + '.' + ( i-1 )
                    });
            });

    }

    static cleanUp() {
        log.info(LOG_PREFIX, 'cleaning-up docker containers');

        return new Promise((resolve, reject) => {
            docker.listContainers({ all: true }, (err, containers) => {
                if (err) return reject(err);

                let toRemove = [];
                let regex = new RegExp(CONTAINER_PREFIX, 'i');

                containers.forEach((info) => {
                    if (regex.test(info.Names[0])) {
                        toRemove.push(docker.getContainer(info.Id));
                    }
                });

                Promise
                    .all(toRemove.map(c => DockerPs.removeContainer(c)))
                    .then(resolve)
                    .catch(reject);
            });
        });
    }

    static removeContainer(container) {
        return new Promise((resolve, reject) => {
            container.stop(err => {
                // Error 304 = already stopped
                if (err && err.statusCode !== 304) return reject(err);

                container.remove(err => {
                    if (err) return reject(err);
                    return resolve();
                });
            });
        });
    }

    static startContainer(config) {
        return new Promise((resolve, reject) => {
            docker.createContainer(config, (err, container) => {
                if (err) return reject(err);

                container.start(err => {
                    if (err) return reject(err);

                    resolve(container);
                });
            });
        });
    }

    static getNodeURI(container) {
        let regex = new RegExp('enode://[0-9a-zA-e]+@[0-9\.]+:[0-9+]', 'i');
        let foundURI = false;

        return new Promise((resolve, reject) => {
            container.logs({ stdout: 1, stderr: 1 }, (err, response) => {
                if (err) return reject(err);

                response
                    .pipe(through2((chunk, enc, cb) => {
                        let log = chunk.toString();

                        if (regex.test(log)) {
                            let uri = regex.exec(log)[0];
                            foundURI = true;
                            return resolve(uri);
                        }

                        cb();
                    }))
                    .on('finish', () => {
                        if (foundURI) return true;

                        // Schedule another log attempt in 500ms
                        setTimeout(() => {
                            DockerPs
                                .getNodeURI(container)
                                .then(resolve)
                                .catch(reject);
                        }, 500);
                    })
                    .on('error', err => {
                        return reject(err);
                    });
            });
        });
    }

};