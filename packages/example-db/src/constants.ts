// Collections are namespaced by network so a single Firestore project can hold
// mainnet, testnet, and local data side by side without collisions — the same
// convention the production indexers use.
export const eventsCollection = (network: string) => `example_events_${network}`;
export const cursorsCollection = (network: string) => `example_cursors_${network}`;
