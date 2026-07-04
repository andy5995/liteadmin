# LiteAdmin — single-container image (Caddy + php-fpm 8.4)
FROM php:8.4-fpm

# Caddy web server (from its official image) + SQLite PDO driver.
# The app is vanilla PHP/JS, so there is no build step.
COPY --from=caddy:2 /usr/bin/caddy /usr/bin/caddy
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends libsqlite3-dev; \
    docker-php-ext-install pdo_sqlite; \
    rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/liteadmin
COPY src/ ./src/

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN set -eux; \
    chmod +x /usr/local/bin/entrypoint.sh; \
    php -r '$c=json_decode(file_get_contents("src/config.json"),true); $c["auth"]["password_hash"]=""; file_put_contents("src/config.json", json_encode($c, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)."\n");'; \
    chown -R www-data:www-data /var/www/liteadmin/src; \
    chmod 640 /var/www/liteadmin/src/config.json

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
