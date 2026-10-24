# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and test suite
COPY src ./src
COPY tests ./tests
COPY jest.config.js ./

EXPOSE 8080

CMD ["node", "src/index.js"]
