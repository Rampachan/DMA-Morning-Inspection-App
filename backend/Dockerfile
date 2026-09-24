# ---- Builder Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .
RUN npm run build

RUN npm prune --production

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

# libvips for sharp on Alpine
RUN apk add --no-cache vips-dev

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

RUN addgroup -S mcrs && adduser -S mcrs -G mcrs
USER mcrs

EXPOSE 3000

CMD ["node", "dist/main"]
