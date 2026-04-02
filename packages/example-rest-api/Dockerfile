# Stage 1: build workspace library packages and create a self-contained production bundle
FROM node:24-bookworm-slim AS builder
WORKDIR /app

RUN npm install -g pnpm@10.30.3

# Full workspace copy — required by pnpm deploy to resolve workspace:* deps
COPY . .
ENV CI=true

# Install all deps including devDeps (needed for tsc, generate-spec, etc.)
# --ignore-scripts: supply chain safety; build is invoked explicitly below
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build workspace library packages before pnpm deploy.
#
# pnpm deploy copies packages into a real node_modules/ directory (no symlinks).
# In that context Node 24 refuses to type-strip files under node_modules/, so
# workspace libraries that export .ts source would throw
# ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING. Building them to dist/ first
# ensures the deployed bundle resolves compiled JavaScript via the `import`
# export condition.
#
# Local development is unaffected: pnpm workspace symlinks let Node follow the
# realpath (outside node_modules/) where type stripping still applies.
RUN pnpm run build

# Create a self-contained production bundle for this service.
# pnpm resolves workspace:* deps and copies their declared 'files' (dist/).
ARG SERVICE_NAME=example-rest-api
RUN pnpm --filter "${SERVICE_NAME}" deploy --prod --legacy /deploy


# Stage 2: minimal runtime — no pnpm, no devDeps, no workspace knowledge
FROM node:24-bookworm-slim
WORKDIR /app

COPY --from=builder /deploy ./

RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 3000

CMD ["node", "src/index.ts"]
