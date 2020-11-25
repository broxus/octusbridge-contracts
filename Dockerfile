FROM node:12

WORKDIR /app

RUN npm install --unsafe-perm --allow-root -g truffle @truffle/hdwallet-provider dotenv

ENV NODE_PATH=/usr/local/lib/node_modules

COPY ./wait-for-it.sh /usr/local/bin/wait-for-it.sh
