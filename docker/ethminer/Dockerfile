FROM ubuntu:trusty

# Install dependencies and `ethminer`
RUN apt-get update && \
    apt-get -y install software-properties-common && \
    add-apt-repository -y ppa:ethereum/ethereum && \
    apt-get -y update && \
    apt-get -y install ethminer

RUN useradd -ms /bin/bash ubuntu

ENTRYPOINT ["ethminer"]
CMD ["--help"]
