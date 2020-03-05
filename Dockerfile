FROM node:10
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y && \
    apt-get install -y build-essential apt-utils git curl supervisor systemd software-properties-common && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get autoremove -y && \
    apt-get clean

ADD . /rsk-explorer-api
WORKDIR /rsk-explorer-api
RUN git checkout -B docker-branch origin/master
RUN mkdir /var/log/rsk-explorer/ &&\
    touch /var/log/rsk-explorer/blocks.json &&\
    touch /var/log/rsk-explorer/api.json
RUN npm install
COPY dockerized/explorer-api/config.json /rsk-explorer-api/config.json
COPY dockerized/explorer-api/supervisord.conf /etc/supervisor/conf.d/explorer.conf
CMD ["/usr/bin/supervisord"]