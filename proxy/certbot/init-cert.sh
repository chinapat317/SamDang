#!/bin/sh
set -e

DOMAIN="localhost"
EMAIL="chinapat.r@ku.th"

certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --keep-until-expiring \
  -d "$DOMAIN"
