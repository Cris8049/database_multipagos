FROM node:16-alpine3.14

WORKDIR /app
COPY . .
RUN yarn install --production

EXPOSE 8080

CMD [ "yarn", "start" ]