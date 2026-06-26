#!/bin/sh
set -e

DOMAIN="152.42.184.65"
EMAIL="jojoboy1997@gmail.com"

certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --keep-until-expiring \
  -d "$DOMAIN"
