FROM node:20-alpine

WORKDIR /mock

COPY package*.json ./
RUN npm install

COPY index.js .
COPY routes.js .

EXPOSE 8090

CMD ["node", "index.js"]
