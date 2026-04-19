FROM node:18-slim

WORKDIR /app

# Install dependencies (separate layer for better cache reuse)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Exclude .env from the image (use docker-compose environment: instead)
RUN rm -f .env

EXPOSE 5000

CMD ["node", "server.js"]
