FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY src/prisma ./src/prisma
COPY yarn.lock ./

RUN yarn install
RUN yarn db:generate

FROM node:22-slim AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

CMD ["yarn", "start"]
