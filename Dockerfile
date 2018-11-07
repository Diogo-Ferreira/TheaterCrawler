FROM node:10

COPY bot.js crawler.js index.js package.json utils.js .babelrc /app/

WORKDIR /app

RUN npm i

RUN npm run build

ENV SLACK_WEB_HOOK ""

ENTRYPOINT [ "/usr/local/bin/node", "dist/index.js"]