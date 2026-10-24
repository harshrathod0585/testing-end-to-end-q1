# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package.json .
RUN npm ci --only=production

# Copy source code
COPY src ./src

EXPOSE 8080

CMD ["node", "src/index.js"]