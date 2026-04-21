FROM node:20-slim

# Install system dependencies needed for better-sqlite3 (native compilation)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Exclude .env from the image (use docker-compose environment: instead)
RUN rm -f .env

EXPOSE 5000

CMD ["node", "server.js"]
