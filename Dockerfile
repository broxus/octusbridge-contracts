FROM node:12

COPY package.json package.json

RUN npm install --unsafe-perm --allow-root

ENV NODE_PATH=/node_modules

WORKDIR /app

COPY ./wait-for-it.sh /usr/local/bin/wait-for-it.sh
COPY ./sleep_and_test_ton.sh /usr/local/bin/sleep_and_test_ton.sh
