FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

RUN mkdir -p uploads

EXPOSE 3000

CMD ["sh", "-c", "node dist/scripts/run-migrations.js && node dist/src/main.js"]
