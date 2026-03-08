FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY data ./data
RUN test -f data/recipes.db || (echo "ERROR: data/recipes.db not found. Run 'npm run scrape && npm run embed' first." && exit 1)

ENV PORT=3000
EXPOSE ${PORT}

CMD ["node", "dist/index.js"]
