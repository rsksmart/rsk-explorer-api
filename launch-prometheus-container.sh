docker run --rm -p 6000:9090 \
  -v `pwd`/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:v2.20.1