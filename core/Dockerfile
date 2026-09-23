FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p storage/task-attachments
EXPOSE 3000
CMD ["node", "app.js"]
