// Generated fetch functions — imported but NOT re-exported directly.
// Only the semantic facade is the public API so callers are insulated from
// orval rename churn when the spec evolves.
import { setBaseUrl } from './fetcher.ts';
import { getBlockNumber, getHealthCheck, getHello } from './generated/client.ts';

// Re-export schema types for consumers who want to reference them.
// Return types on the facade methods are inferred from the generated
// functions so they stay in sync automatically — never annotate them
// manually.
export type {
  BlockNumberResponse,
  HealthCheckResponse,
  HelloResponse
} from '@polygonlabs/example-schemas';

export function createExampleClient(baseUrl: string) {
  setBaseUrl(baseUrl);
  return {
    getHealthCheck,
    getHello,
    getBlockNumber
  };
}

// Derived from the implementation — can never drift from reality.
export type ExampleClient = ReturnType<typeof createExampleClient>;
