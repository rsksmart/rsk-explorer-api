#
# RSK Node Dockerfile
#

# Pull base image.
FROM ubuntu:bionic@sha256:152dc042452c496007f07ca9127571cb9c29697f42acbfad72324b2bb2e43c98

MAINTAINER RSK Release <support@rsk.co>

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get install -y --no-install-recommends openjdk-8-jre supervisor systemd software-properties-common

# Install RSK.
RUN groupadd --gid 888 rsk && useradd rsk -d /var/lib/rsk -s /sbin/nologin --uid=888 --gid=888

RUN \
  add-apt-repository -y ppa:rsksmart/rskj && \
  apt-get update && \
  (echo rskj shared/accepted-rsk-license-v1-1 select true | /usr/bin/debconf-set-selections )&& \
  apt-get install -y --no-install-recommends rskj && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* && \
  rm -f /etc/rsk/node.conf && \
  ln -s /etc/rsk/regtest.conf /etc/rsk/node.conf && \
  rm -f /etc/rsk/regtest.conf
COPY regtest.conf /etc/rsk/regtest.conf

# Supervisod CONF
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 4444
EXPOSE 30305

# Define default command.
CMD ["/usr/bin/supervisord"]