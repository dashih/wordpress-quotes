FROM node:16.17.0
WORKDIR /home/node/app
COPY . .
EXPOSE 80
CMD [ "node", "app.js" ]
HEALTHCHECK CMD curl --fail http://localhost/api/getRandomQuote
