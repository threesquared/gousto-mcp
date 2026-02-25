FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY data ./data
RUN test -f data/recipes.json || (echo "ERROR: data/recipes.json not found. Run the scraper first." && exit 1)

ENV PORT=3000
EXPOSE ${PORT}

CMD ["node", "dist/index.js"]
