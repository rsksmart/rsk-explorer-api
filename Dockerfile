FROM node:12 as node
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y && \
    apt-get install -y build-essential apt-utils git curl software-properties-common && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get autoremove -y && \
    apt-get clean

RUN npm install pm2 -g



FROM node as explorer-env

ADD . /rsk-explorer-api
WORKDIR /rsk-explorer-api
RUN git checkout -B docker-branch origin/master
RUN mkdir /var/log/rsk-explorer/ &&\
    touch /var/log/rsk-explorer/blocks.json &&\
    touch /var/log/rsk-explorer/api.json
RUN npm install
RUN npm run build
COPY dockerized/explorer-api/config.json /rsk-explorer-api/config.json

FROM explorer-env as services
CMD ["pm2-runtime", "dist/services/blocks.config.js"]

FROM explorer-env as api
CMD ["pm2-runtime","dist/api/index.js"]