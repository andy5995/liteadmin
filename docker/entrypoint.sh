#!/bin/sh
set -e

chown -R www-data:www-data \
    /var/www/liteadmin/src/databases \
    /var/www/liteadmin/src/config.json 2>/dev/null || true

php-fpm -D
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
