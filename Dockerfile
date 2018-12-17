FROM node:8
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y && \
    apt-get install -y build-essential apt-utils git curl supervisor systemd software-properties-common && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get autoremove -y && \
    apt-get clean

ADD . /rsk-explorer-api
WORKDIR /rsk-explorer-api
RUN git checkout -B docker-branch origin/master
RUN /usr/local/bin/npm install forever -g &&\
    mkdir /var/log/rsk-explorer/ &&\
    touch /var/log/rsk-explorer/blocks.json &&\
    touch /var/log/rsk-explorer/api.json
RUN /usr/local/bin/npm install
COPY dockerized/explorer/supervisord-api.conf /etc/supervisor/conf.d/supervisord-api.conf
COPY dockerized/explorer/config.json /rsk-explorer-api/config.json
COPY dockerized/explorer/supervisord-blocks.conf /etc/supervisor/conf.d/supervisord-blocks.conf
ENTRYPOINT ["/usr/bin/supervisord"]