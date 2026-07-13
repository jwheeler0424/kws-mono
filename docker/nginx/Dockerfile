FROM nginx:1.27-alpine

COPY docker/nginx.swarm.local.conf.template /etc/nginx/templates/default.conf.template
COPY docker/nginx-entrypoint.sh /usr/local/bin/nginx-entrypoint.sh

RUN sed -i 's/\r$//' /usr/local/bin/nginx-entrypoint.sh \
    && chmod +x /usr/local/bin/nginx-entrypoint.sh

ENTRYPOINT ["sh", "/usr/local/bin/nginx-entrypoint.sh"]
