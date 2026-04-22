// Loads .env.test into process.env so `vitest run` works no matter how it's
// invoked — plain `pnpm exec vitest`, the IDE test runner, or `pnpm test`.
// Runs once per worker before any test-file import, so it's in place by the
// time tests/helpers/agent.ts's top-level `createLogger()` resolves env via
// `@t3-oss/env-core`.
import { config } from '@dotenvx/dotenvx';

config({ path: '.env.test', quiet: true });
