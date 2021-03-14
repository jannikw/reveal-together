FROM node:15-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY app.js ./
COPY templates ./templates

EXPOSE 8888

CMD [ "node", "app.js" ]
