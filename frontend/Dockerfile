# ── Build stage ───────────────────────────────────────────────────────────────
# FROM node:18-slim AS build
FROM node:20-slim AS build
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./

# Increase NPM stability for slower networks
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-audit --no-fund

# Copy source and build the production bundle
COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
# Single Nginx stage — the previous file had TWO 'FROM nginx' lines which caused
# the first stage to be silently discarded, breaking the COPY --from=build.
FROM nginx:stable-alpine

# Copy compiled React app into Nginx's serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx config for SPA: all unknown routes fall through to index.html
# so React Router can handle client-side navigation.
RUN printf '\
server {\n\
    listen 80;\n\
    server_name localhost;\n\
    client_max_body_size 50M;\n\
\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Serve static assets with long cache headers\n\
    location /assets/ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
\n\
    # Reverse proxy API calls to backend Express gateway\n\
    location /api/ {\n\
        proxy_pass http://backend:5000;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_read_timeout 300s;\n\
        proxy_send_timeout 300s;\n\
        # Disable buffering for SSE event streams\n\
        proxy_buffering off;\n\
        proxy_cache off;\n\
    }\n\
\n\
    # SPA fallback — route everything to index.html\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n\
' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
