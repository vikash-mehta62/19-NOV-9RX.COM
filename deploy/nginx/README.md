# Nginx Security Headers

Use the provided snippet to enforce security headers at the edge.

## 1. Copy snippet

Copy `deploy/nginx/security-headers.conf` to your nginx server, for example:

`/etc/nginx/snippets/security-headers.conf`

## 2. Include in HTTPS server block

In your nginx site config (inside `server { ... }` that serves `443 ssl`):

```nginx
include /etc/nginx/snippets/security-headers.conf;
```

## 3. Keep HTTP -> HTTPS redirect

```nginx
server {
  listen 80;
  server_name 9rx.com www.9rx.com;
  return 301 https://$host$request_uri;
}
```

## 4. Validate and reload

```bash
nginx -t
sudo systemctl reload nginx
```

## 5. Verify headers

```bash
curl -I https://9rx.com
```

Expected to include:
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `Permissions-Policy`
