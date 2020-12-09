FROM node:10.22

COPY package.json package.json
COPY free-ton free-ton

RUN npm install --unsafe-perm --allow-root

ENV NODE_PATH=/node_modules

WORKDIR /app

COPY ./wait-for-it.sh /usr/local/bin/wait-for-it.sh
