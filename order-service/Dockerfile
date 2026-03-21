FROM node:18-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY src/ ./src/
COPY openapi.yaml ./
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3003/health || exit 1
CMD ["node", "src/server.js"]
