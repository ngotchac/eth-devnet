let Docker = require('dockerode'),
    archiver = require('archiver'),
    log = require('npmlog'),
    temp = require('temp'),
    through2 = require('through2'),
    path = require('path'),
    fs = require('fs');

const IMAGES = [ 'parity', 'ethminer' ];
const TAG_PREFIX = 'eth-devnet/';

const LOG_PREFIX = 'eth-devnet/docker-utils';

// Track temporary files and clean at exit
temp.track();

let docker = new Docker();

module.exports = class DockerImages {

    static getImages() {
        return IMAGES.map(name => {
            let folder = path.resolve(__dirname + '/../docker/' + name);

            return {
                name: name,
                tag: TAG_PREFIX + name,
                folder: folder,
                meta: DockerImages.getImageMeta(folder)
            };
        });
    }

    static checkImages() {
        var images = DockerImages.getImages();

        return new Promise((resolve, reject) => {
            docker.listImages((err, dImages) => {
                if (err) return reject(err);

                let toBuild = images,
                    toRemove = [];

                let regex = new RegExp(`^${TAG_PREFIX}`, 'i'),
                    nameRegex = new RegExp(`^${TAG_PREFIX}([^:]+)`, 'i');

                dImages
                    .forEach(dImage => {
                        let tag = dImage.RepoTags[0];

                        // If it's not an eth-devnet image,
                        // skip
                        if (!regex.test(tag)) return false;

                        let name = nameRegex.exec(tag)[1];
                        let image = images.find(i => i.name === name);

                        // If no corresponding image, remove it
                        if (!image) {
                            toRemove.push(dImage);
                            return false;
                        }

                        let meta = image.meta;

                        // If no or lower version, remove it
                        let version = dImage.Labels.version;
                        if (!version || parseInt(version) < meta.version) {
                            toRemove.push(dImage);
                            return false;
                        }

                        // Else, keep the image, remove it from
                        // the `toBuild` array
                        toBuild = toBuild.filter(i => i.name !== image.name);
                    });

                if (toRemove.length === 0 && toBuild.length === 0) {
                    log.info(LOG_PREFIX, `all the images are up-to-date`);
                } else {
                    log.info(LOG_PREFIX, `removing ${toRemove.length} images and building ${toBuild.length} new images...`);
                }

                let p = Promise.resolve();

                if (toRemove.length > 0) {
                    let DockerPs = require('./docker-ps');
                    p = p.then(() => DockerPs.cleanUp());
                }

                toRemove.forEach(dImage => {
                    p = p.then(() => DockerImages.removeImage(dImage));
                });

                toBuild.forEach(image => {
                    let meta = image.meta;
                    p = p.then(() => DockerImages.createImage(image, meta));
                });

                return p
                    .then(d => resolve(d))
                    .catch(e => reject(e));
            });
        });
    }

    static removeImage(dImage) {
        return new Promise((resolve, reject) => {
            let image = docker.getImage(dImage.Id);

            log.info(LOG_PREFIX, 'removing image ' + dImage.RepoTags[0]);

            image.remove((err, data) => {
                if (err) return reject(err);
                return resolve(data);
            });
        });
    }

    static getImageMeta(folder) {
        let meta = require(path.resolve(folder + '/meta.json'));

        let res = {
            version: meta.version,
            folder: folder
        };

        if (meta.files) {
            res.files = meta.files
                .map(file => ({
                    path: path.resolve(folder + '/' + file.path),
                    name: file.name
                }));
        }

        return res;
    }

    static createImage(image, meta) {
        log.info(LOG_PREFIX, `creating a Docker image for "${image.name}" v${meta.version}`);

        return new Promise((resolve, reject) => {
            // Open a temporary TAR file
            temp.open({ suffix: '.tar' }, (err, info) => {
                if (err) return reject(err);

                log.verbose(LOG_PREFIX, `creating the TAR archive at "${info.path}"`);

                let tempStream = fs.createWriteStream(info.path),
                    archive = archiver.create('tar');

                // Stream the archive into the temp file
                archive.pipe(tempStream);

                // Append the Dockerfile
                let dockerfile = path.resolve(image.folder + '/Dockerfile');

                archive.append(
                        fs.createReadStream(dockerfile),
                        { name: 'Dockerfile' }
                    );

                if (meta.files) {
                    meta.files.forEach(file => {
                        archive.append(
                            fs.createReadStream(file.path),
                            { name: file.name }
                        );
                    });
                }


                archive.finalize();

                tempStream.on('close', () => {
                    log.info(LOG_PREFIX, `building the image:`);

                    docker.buildImage(
                        info.path,
                        {
                            t: image.tag,
                            labels: {version: meta.version.toString()}
                        },
                        (err, response) =>{
                            if (err) return reject(err);

                            response
                                .pipe(through2.obj((chunk, enc, cb) => {
                                    // Write on STDOUT
                                    let data = JSON.parse(chunk.toString());
                                    
                                    if (data.stream) {
                                        process.stdout.write(data.stream);
                                    } else if (data.error) {
                                        return reject(data.error);
                                    } else {
                                        log.warn(LOG_PREFIX, 'no stream data', chunk.toString());
                                    }

                                    cb();
                                }))
                                .on('finish', () => {
                                    return resolve();
                                })
                                .on('error', err => {
                                    return reject(err);
                                });
                        }
                    );
                });

                archive.on('error', err => {
                    return reject(err);
                });
            });
        });
    }

};
