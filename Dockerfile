FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Expose ports for Next.js and WebSocket
EXPOSE 3000 3001
