let Docker = require('dockerode'),
    through2 = require('through2'),
    inquirer = require('inquirer'),
    keythereum = require('keythereum'),
    path = require('path'),
    temp = require('temp'),
    fs = require('fs'),
    log = require('npmlog');

let docker = new Docker();

// Automatically track and cleanup files at exit
temp.track();

let DockerImages = require('./docker-images');
let DockerPs = require('./docker-ps');
let Utils = require('./utils');

const LOG_PREFIX = 'eth-devnet/accounts';
const CONTAINER_NAME = 'eth-devnet.tmp.parity';

module.exports = class Accounts {

    static list() {
        let images = DockerImages.getImages();
        let nodeImage = images.find(i => i.name === 'parity');
        let nodeCmd = [].concat([ 'account', 'list' ], nodeImage.meta.Cmd);
        let parityDir = path.resolve(Utils.appDir + '/.parity');

        return DockerPs
            .removeContainer(docker.getContainer(CONTAINER_NAME))
            .then(() => DockerPs.startContainer('', {
                Image: nodeImage.tag,
                Cmd: nodeCmd,
                HostConfig: {
                    Binds: [ `${parityDir}:/parity` ]
                },
                name: CONTAINER_NAME
            }))
            .then(container => {
                return new Promise((resolve, reject) => {
                    container
                        .attach({
                            stream: true,
                            stdout: true,
                            stderr: true
                        }, (err, stream) => {
                            let logs = '';

                            container.modem
                                .demuxStream(
                                    stream,
                                    through2(chunk => logs += chunk),
                                    through2(chunk => logs += chunk)
                                );

                            stream.on('end', () => {
                                let regex = /([a-f0-9]+)/gi;
                                
                                let addresses = [],
                                    res = regex.exec(logs);

                                while (res) {
                                    addresses.push(res[1]);
                                    res = regex.exec(logs);
                                }

                                DockerPs
                                    .removeContainer(container)
                                    .then(() => resolve(addresses))
                                    .catch(reject);
                            });
                        });
                });
            });
    }

    static new() {
        return inquirer
            .prompt({
                type: 'password',
                name: 'password_first',
                message: 'Enter a password for your new key: '
            })
            .then(answer => {
                return inquirer
                    .prompt({
                        type: 'password',
                        name: 'password',
                        message: 'Repeat the password: ',
                        validate: input => {
                            return input === answer.password_first
                                ? true
                                : 'wrong password';
                        }
                    });
            })
            .then(answer => {
                let password = answer.password;

                return new Promise((resolve, reject) => {
                    keythereum.create({}, dk => {
                        keythereum.dump(password, dk.privateKey, dk.salt, dk.iv, {}, keyObject => {
                            let id = keyObject.id;
                            
                            // Create a temporary directorty
                            temp.mkdir('eth-devnet.tmp', (err, dirpath) => {
                                if (err) return reject(err);

                                let filepath = path.resolve(dirpath + '/' + id);

                                log.info(LOG_PREFIX, 'creating the key file in', filepath);

                                fs.writeFile(filepath, JSON.stringify(keyObject), err => {
                                    if (err) return reject(err);

                                    return Accounts
                                        .import(dirpath)
                                        .then(logs => {
                                            log.info(LOG_PREFIX, 'logs:', logs);

                                            return resolve(keyObject.address);
                                        })
                                        .catch(reject);
                                });
                            });
                        });
                    });
                });
            });
    }

    static import(dirpath) {
        let images = DockerImages.getImages();
        let nodeImage = images.find(i => i.name === 'parity');
        let nodeCmd = [].concat([ 'account', 'import', dirpath ], nodeImage.meta.Cmd);
        let parityDir = path.resolve(Utils.appDir + '/.parity');

        return DockerPs
            .removeContainer(docker.getContainer(CONTAINER_NAME))
            .then(() => DockerPs.startContainer('', {
                Image: nodeImage.tag,
                Cmd: nodeCmd,
                HostConfig: {
                    Binds: [
                        `${parityDir}:/parity`,
                        `${dirpath}:${dirpath}`
                    ]
                },
                name: CONTAINER_NAME
            }))
            .then(container => {
                return new Promise((resolve, reject) => {
                    container
                        .attach({
                            stream: true,
                            stdout: true,
                            stderr: true
                        }, (err, stream) => {
                            let logs = '';

                            container.modem
                                .demuxStream(
                                    stream,
                                    through2(chunk => logs += chunk),
                                    through2(chunk => logs += chunk)
                                );

                            stream.on('end', () => {
                                DockerPs
                                    .removeContainer(container)
                                    .then(() => resolve(logs))
                                    .catch(reject);
                            });
                        });
                });
            });
    }

};
