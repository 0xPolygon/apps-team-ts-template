# Stage 1: build all workspace packages and create a self-contained production bundle
FROM node:24-bookworm-slim AS builder
WORKDIR /app

RUN npm install -g pnpm@10.30.3

# Full workspace copy — required by pnpm deploy to resolve workspace:* deps
COPY . .

# Install all deps including devDeps (needed for tsc, generate-spec, etc.)
# --ignore-scripts: supply chain safety; build is invoked explicitly below
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build all workspace packages in topological/dependency order.
# Root 'build' script runs pnpm -r run build --if-present — packages without a
# 'build' script are silently skipped.
# When schemas is added, this builds it automatically with no Dockerfile change.
RUN pnpm run build

# Create a self-contained production bundle for this service.
# pnpm resolves workspace:* deps and copies their declared 'files' (e.g. dist/ for
# schemas). No explicit COPY for each dep — pnpm handles all workspace resolution.
#
# SERVICE_NAME is the full npm package name (e.g. @polygonlabs/gas-station or
# example-rest-api). Passed as --build-arg from docker-release.yml. No default —
# fails fast at build time if not provided.
# Every service Dockerfile is identical — SERVICE_NAME is the only variable.
ARG SERVICE_NAME
RUN pnpm --filter "${SERVICE_NAME}" deploy --prod --legacy /deploy


# Stage 2: minimal runtime — no pnpm, no devDeps, no workspace knowledge
FROM node:24-bookworm-slim
WORKDIR /app

COPY --from=builder /deploy ./

RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 3000

# Entry point defined in this package's 'scripts.start'
CMD ["npm", "start"]
