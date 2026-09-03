# This Dockerfile delegates to the backend build
# Railway will detect this and use it automatically
FROM node:22-alpine AS build
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend .
RUN npx prisma generate && npm run build

# ---------- runtime ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/generated ./generated
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/main.js"]
