FROM node:22-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=7343 DATA_DIR=/data
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 7343
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:7343/healthz >/dev/null || exit 1
CMD ["node", "--no-warnings=ExperimentalWarning", "src/server.mjs"]
