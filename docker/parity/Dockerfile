FROM ubuntu:wily

WORKDIR /build

## Install `wget` and `curl`
RUN apt-get update && \
    apt-get install -y wget curl

## Download the latest version of Parity from
## GitHub releases
RUN cd /build && \
    wget https://github.com$(curl -s -L https://github.com/ethcore/parity/releases/latest/ | egrep -o "(/ethcore/parity/.*\.deb)")

## Install the client
RUN dpkg -i /build/parity*.deb

ADD morden.json /build

ENTRYPOINT ["parity"]
CMD ["--help"]
