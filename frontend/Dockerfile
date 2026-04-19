# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:18-slim AS build

WORKDIR /app

# Install dependencies first (better layer caching — only re-runs on package changes)
COPY package*.json ./
RUN npm install

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
    # SPA fallback — route everything to index.html\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n\
' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
