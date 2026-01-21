# Build stage for client
FROM node:18-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./

RUN npm ci --legacy-peer-deps

COPY client/ ./

RUN npm run build

# Main stage for server
FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./

RUN npm ci --legacy-peer-deps

COPY server/ ./

# Copy built client to server public folder
COPY --from=client-builder /app/client/build ./public

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
