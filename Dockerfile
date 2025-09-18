# ---------- Build Stage ----------
FROM node:22-alpine AS builder

# Enable pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy lockfile and manifest for caching
COPY pnpm-lock.yaml package.json ./

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Copy the rest of your source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build your application
RUN pnpm build

# ---------- Production Stage ----------
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy only prod dependencies and built code
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh
# Expose your application's port
EXPOSE 3000

# Use pnpm to serve the built app
ENTRYPOINT [ "./entrypoint.sh" ]