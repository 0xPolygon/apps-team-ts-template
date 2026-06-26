# Stage 1: build workspace library packages and create a self-contained production bundle
FROM node:24-bookworm-slim AS builder
WORKDIR /app

RUN npm install -g pnpm@10.30.3

# Full workspace copy — required by pnpm deploy to resolve workspace:* deps
COPY . .
ENV CI=true

# Install all deps including devDeps (needed for tsc to build the libraries).
# --ignore-scripts: supply chain safety; build is invoked explicitly below.
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build workspace library packages (example-db) before pnpm deploy.
#
# pnpm deploy copies packages into a real node_modules/ directory (no symlinks).
# In that context Node 24 refuses to type-strip files under node_modules/, so a
# workspace library that exports .ts source would throw
# ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING. Building libraries to dist/ first
# ensures the deployed bundle resolves compiled JavaScript via the `import`
# export condition. example-indexer itself is run as source (its own src/ is
# outside node_modules in the bundle), so it needs no build.
RUN pnpm run build

# Create a self-contained production bundle for this service.
# Unscoped on purpose: pnpm --filter matches the scoped package
# (@polygonlabs/example-indexer) by its unscoped name.
ARG SERVICE_NAME=example-indexer
RUN pnpm --filter "${SERVICE_NAME}" deploy --prod --legacy /deploy


# Stage 2: minimal runtime — no pnpm, no devDeps, no workspace knowledge
FROM node:24-bookworm-slim
WORKDIR /app

COPY --from=builder /deploy ./

RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 3000

CMD ["node", "src/index.ts"]
