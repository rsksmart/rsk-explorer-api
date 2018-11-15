FROM ubuntu:latest
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y && \
    apt-get install -y build-essential apt-utils git curl supervisor systemd software-properties-common && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get autoremove -y && \
    apt-get clean
ADD . /rsk-explorer-api
WORKDIR /rsk-explorer-api
RUN git checkout . && git clean -ffd && git pull --rebase
RUN curl -sL https://deb.nodesource.com/setup_8.x -o nodesource_8_setup.sh &&\
    bash nodesource_8_setup.sh &&\
    rm -f nodesource_8_setup.sh &&\
    apt install nodejs -y &&\
    npm install pm2@latest -g &&\
    mkdir /var/log/rsk-explorer/ &&\
    touch /var/log/rsk-explorer/blocks.json &&\
    touch /var/log/rsk-explorer/api.json &&\            
    pm2 status
RUN npm install
COPY explorer/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY explorer/config.json /rsk-explorer-api/config.json
CMD ["/usr/bin/supervisord"]