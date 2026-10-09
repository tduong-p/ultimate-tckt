FROM node:22-slim AS web-build
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
COPY core/package.json core/package-lock.json ./
RUN npm ci --omit=dev
COPY core/ ./
COPY --from=web-build /src/web/dist ./web-dist
RUN mkdir -p storage/task-attachments
EXPOSE 3000
CMD ["node", "app.js"]
